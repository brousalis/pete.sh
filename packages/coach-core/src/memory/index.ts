/**
 * Coach memory.
 *
 * The previous AI coach had no memory across conversations, and the unified
 * assistant's key/value store held only five generic keys with last-write-wins
 * semantics. Neither survives a year of training.
 *
 * This model has four properties that matter over 48 weeks:
 *
 *   Typed. A preference ("hates treadmills") and an episode ("knee flared
 *   after the 40-mile ride") decay at different rates and are recalled in
 *   different situations.
 *   Reinforced. Repeating a fact strengthens it instead of overwriting it.
 *   Decaying. Unused memories fade, so a constraint from October does not
 *   still dominate recall in June.
 *   Supersedable. A contradicting fact points at the one it replaces, leaving
 *   an audit trail rather than silently rewriting history.
 */

export type MemoryType = 'fact' | 'preference' | 'episode' | 'insight'

export interface CoachMemory {
  id: string
  memoryType: MemoryType
  content: string
  tags: string[]
  confidence: number
  strength: number
  reinforceCount: number
  lastReinforcedAt: string
  source: string | null
  supersededBy: string | null
}

/**
 * Half-life in days, per type.
 *
 * Episodes fade fastest: what happened in one session matters for weeks, not
 * forever. Facts about the body barely decay at all — an MRI finding is still
 * true in August.
 */
const HALF_LIFE_DAYS: Record<MemoryType, number> = {
  fact: 720,
  preference: 365,
  insight: 180,
  episode: 90,
}

/**
 * Strength after decay, given time since last reinforcement.
 *
 * Reinforcement extends the effective half-life, so something mentioned
 * repeatedly persists far longer than something said once.
 */
export function decayedStrength(memory: CoachMemory, now: Date = new Date()): number {
  const lastReinforced = new Date(memory.lastReinforcedAt).getTime()
  const days = Math.max(0, (now.getTime() - lastReinforced) / 86_400_000)

  const baseHalfLife = HALF_LIFE_DAYS[memory.memoryType]
  // Each repetition adds 50% to the half-life, capped at 4x so a single
  // over-repeated fact cannot become permanent.
  const reinforcement = Math.min(4, 1 + (memory.reinforceCount - 1) * 0.5)
  const halfLife = baseHalfLife * reinforcement

  return Math.max(0, Math.min(1, Math.pow(0.5, days / halfLife)))
}

/** Memories below this effective strength are excluded from recall. */
export const RECALL_STRENGTH_FLOOR = 0.25

export interface ScoredMemory extends CoachMemory {
  /** Cosine similarity from the vector search. */
  similarity: number
  /** Combined ranking score. */
  score: number
  effectiveStrength: number
}

/**
 * Rank recalled memories.
 *
 * Similarity alone surfaces stale but topically close memories; strength
 * alone surfaces strong but irrelevant ones. The product, weighted by
 * confidence, keeps both in play.
 */
export function rankMemories(
  candidates: (CoachMemory & { similarity: number })[],
  now: Date = new Date()
): ScoredMemory[] {
  return candidates
    .filter((memory) => memory.supersededBy === null)
    .map((memory) => {
      const effectiveStrength = decayedStrength(memory, now)
      return {
        ...memory,
        effectiveStrength,
        score: memory.similarity * 0.6 + effectiveStrength * 0.25 + memory.confidence * 0.15,
      }
    })
    .filter((memory) => memory.effectiveStrength >= RECALL_STRENGTH_FLOOR)
    .sort((a, b) => b.score - a.score)
}

/**
 * Decide whether a new memory duplicates, contradicts or extends an existing
 * one.
 *
 * Running this before every write is what stops the store filling with forty
 * near-identical restatements of the same preference.
 */
export interface DedupeDecision {
  action: 'create' | 'reinforce' | 'supersede'
  targetId?: string
  reason: string
}

export function classifyNewMemory(
  incoming: { content: string; memoryType: MemoryType; tags: string[] },
  existing: (CoachMemory & { similarity: number })[]
): DedupeDecision {
  const sameType = existing.filter(
    (memory) => memory.memoryType === incoming.memoryType && memory.supersededBy === null
  )

  const nearDuplicate = sameType.find((memory) => memory.similarity >= 0.93)
  if (nearDuplicate) {
    return {
      action: 'reinforce',
      targetId: nearDuplicate.id,
      reason: 'Restates an existing memory; strengthening it rather than duplicating.',
    }
  }

  // Closely related but not identical, and containing a negation the original
  // lacks, is the signature of a correction.
  const related = sameType.find((memory) => memory.similarity >= 0.82)
  if (related && looksContradictory(incoming.content, related.content)) {
    return {
      action: 'supersede',
      targetId: related.id,
      reason: 'Contradicts an existing memory; superseding it and keeping the history.',
    }
  }

  return { action: 'create', reason: 'New information.' }
}

const NEGATIONS = /\b(no longer|not|never|stopped|instead of|actually|changed to|now prefers)\b/i

function looksContradictory(incoming: string, existing: string): boolean {
  const incomingNegates = NEGATIONS.test(incoming)
  const existingNegates = NEGATIONS.test(existing)
  return incomingNegates !== existingNegates
}

/**
 * Prompt for the digest step that extracts memories from a conversation.
 *
 * Deliberately narrow. The failure mode of automatic memory extraction is
 * recording everything, which fills recall with noise and makes the useful
 * items unfindable.
 */
export const MEMORY_DIGEST_PROMPT = `Extract durable facts about the athlete from this conversation.

Record only things that will still matter in a month:
  fact        Stable truths about their body, history, equipment or logistics.
  preference  How they like to train, what they will and will not do.
  episode     A specific event worth remembering, usually an injury, a
              breakthrough session, or a race.
  insight     A pattern you noticed that should change how they are coached.

Do not record:
  - Anything already stored in structured data: today's readiness, a session's
    load, a pain score that was logged through a tool.
  - Restatements of the plan.
  - Pleasantries, or your own recommendations that were not acted on.

Return an empty array when nothing meets the bar. That is the common case and
is the correct answer.`

/**
 * Rolling conversation summary prompt.
 *
 * Keeps a long thread coherent without resending every turn. Summarise
 * decisions and commitments, not conversational texture.
 */
export const CONVERSATION_SUMMARY_PROMPT = `Summarise this conversation so it can continue without the full transcript.

Keep:
  - Decisions made and changes committed to the plan.
  - Symptoms, constraints or context the athlete disclosed.
  - Open questions and anything you promised to follow up on.

Drop:
  - Greetings, acknowledgements and restated numbers that are already in the
    athlete's data.

Write in the second person, addressing the athlete's history as facts you
know. Under 300 words.`

/** How many recent messages stay verbatim before summarisation. */
export const VERBATIM_MESSAGE_WINDOW = 12

/** Summarise once the thread passes this many messages. */
export const SUMMARY_TRIGGER_MESSAGES = 20

export function shouldSummarise(
  messageCount: number,
  summarisedThrough: number
): boolean {
  return messageCount - summarisedThrough >= SUMMARY_TRIGGER_MESSAGES
}
