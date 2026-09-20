/**
 * Coach memory persistence and recall.
 *
 * Wraps the decay and dedupe logic from coach-core with pgvector storage. The
 * dedupe step is what keeps recall useful: without it a year of conversations
 * produces dozens of near-identical restatements of the same preference and
 * the genuinely useful memories become unfindable.
 */

import {
  classifyNewMemory,
  rankMemories,
  type CoachMemory,
  type MemoryType,
  type ScoredMemory,
} from '@petehome/coach-core'

import { embedText, toVectorLiteral } from './embedding.service'
import { coachDb } from './coach-data.service'

interface MemoryRow {
  id: string
  memory_type: MemoryType
  content: string
  tags: string[]
  confidence: number
  strength: number
  reinforce_count: number
  last_reinforced_at: string
  source: string | null
  superseded_by: string | null
}

function toMemory(row: MemoryRow): CoachMemory {
  return {
    id: row.id,
    memoryType: row.memory_type,
    content: row.content,
    tags: row.tags ?? [],
    confidence: Number(row.confidence),
    strength: Number(row.strength),
    reinforceCount: row.reinforce_count,
    lastReinforcedAt: row.last_reinforced_at,
    source: row.source,
    supersededBy: row.superseded_by,
  }
}

export interface RememberInput {
  content: string
  memoryType: MemoryType
  tags?: string[]
  confidence?: number
  source?: string
  conversationId?: string
}

export interface RememberResult {
  action: 'created' | 'reinforced' | 'superseded'
  memoryId: string
  reason: string
}

/**
 * Store a memory, deduplicating against what is already known.
 */
export async function remember(input: RememberInput): Promise<RememberResult> {
  const db = coachDb()
  const embedding = await embedText(input.content, 'document')

  // Without an embedding there is no similarity to compare, so the memory is
  // created unconditionally. Better a possible duplicate than a lost fact.
  const similar = embedding ? await findSimilar(embedding, 10) : []

  const decision = classifyNewMemory(
    { content: input.content, memoryType: input.memoryType, tags: input.tags ?? [] },
    similar
  )

  if (decision.action === 'reinforce' && decision.targetId) {
    const { data, error } = await db
      .from('coach_memory')
      .select('reinforce_count, confidence')
      .eq('id', decision.targetId)
      .single()

    if (!error && data) {
      await db
        .from('coach_memory')
        .update({
          reinforce_count: (data.reinforce_count ?? 1) + 1,
          // Repetition raises confidence, asymptotically toward 1.
          confidence: Math.min(1, Number(data.confidence ?? 0.7) + 0.05),
          strength: 1.0,
          last_reinforced_at: new Date().toISOString(),
        })
        .eq('id', decision.targetId)

      return { action: 'reinforced', memoryId: decision.targetId, reason: decision.reason }
    }
  }

  const { data: created, error: insertError } = await db
    .from('coach_memory')
    .insert({
      memory_type: input.memoryType,
      content: input.content,
      tags: input.tags ?? [],
      confidence: input.confidence ?? 0.8,
      strength: 1.0,
      reinforce_count: 1,
      last_reinforced_at: new Date().toISOString(),
      source: input.source ?? 'tool',
      source_conversation_id: input.conversationId ?? null,
      embedding: embedding ? toVectorLiteral(embedding) : null,
    })
    .select('id')
    .single()

  if (insertError) throw new Error(`Failed to store memory: ${insertError.message}`)

  if (decision.action === 'supersede' && decision.targetId) {
    // Keep the old row and point it at the replacement, so the history of a
    // changed constraint stays auditable.
    await db
      .from('coach_memory')
      .update({ superseded_by: created.id })
      .eq('id', decision.targetId)

    return { action: 'superseded', memoryId: created.id, reason: decision.reason }
  }

  return { action: 'created', memoryId: created.id, reason: decision.reason }
}

async function findSimilar(
  embedding: number[],
  limit: number
): Promise<(CoachMemory & { similarity: number })[]> {
  const db = coachDb()

  const { data, error } = await db.rpc('coach_match_memories', {
    query_embedding: toVectorLiteral(embedding),
    match_count: limit,
    min_strength: 0,
  })

  if (error) {
    console.error('[coach] Memory similarity search failed:', error.message)
    return []
  }

  // The RPC returns a projection, so the full rows are fetched for decay data.
  const ids = (data ?? []).map((row: { memory_id: string }) => row.memory_id)
  if (ids.length === 0) return []

  const { data: rows } = await db.from('coach_memory').select('*').in('id', ids)

  const similarityById = new Map(
    (data ?? []).map((row: { memory_id: string; similarity: number }) => [
      row.memory_id,
      Number(row.similarity),
    ])
  )

  return (rows ?? []).map((row: MemoryRow) => ({
    ...toMemory(row),
    similarity: similarityById.get(row.id) ?? 0,
  }))
}

/**
 * Recall memories relevant to a query, ranked by similarity, decayed strength
 * and confidence together.
 */
export async function recall(query: string, limit = 8): Promise<ScoredMemory[]> {
  const embedding = await embedText(query, 'query')

  if (!embedding) {
    // Fall back to the strongest recent memories, which is still more useful
    // than nothing when embeddings are unavailable.
    const { data } = await coachDb()
      .from('coach_memory')
      .select('*')
      .is('superseded_by', null)
      .order('last_reinforced_at', { ascending: false })
      .limit(limit)

    return rankMemories((data ?? []).map((row: MemoryRow) => ({ ...toMemory(row), similarity: 0.5 })))
  }

  const candidates = await findSimilar(embedding, Math.max(limit * 3, 20))
  return rankMemories(candidates).slice(0, limit)
}

/**
 * Apply time decay to stored strength values.
 *
 * Recall computes decay on the fly, so this is only needed to keep the
 * persisted column meaningful for the UI and to let the floor filter run in
 * SQL. Executed by the nightly job.
 */
export async function decayMemories(): Promise<number> {
  const db = coachDb()

  const { data, error } = await db
    .from('coach_memory')
    .select('*')
    .is('superseded_by', null)

  if (error) throw new Error(`Failed to load memories for decay: ${error.message}`)

  const now = new Date()
  let updated = 0

  for (const row of (data ?? []) as MemoryRow[]) {
    const memory = toMemory(row)
    const { decayedStrength } = await import('@petehome/coach-core')
    const strength = decayedStrength(memory, now)

    // Only write when the value moved meaningfully, to avoid rewriting the
    // whole table every night.
    if (Math.abs(strength - memory.strength) > 0.01) {
      await db.from('coach_memory').update({ strength }).eq('id', memory.id)
      updated++
    }
  }

  return updated
}

/** Backfill embeddings for memories stored while Voyage was unavailable. */
export async function backfillMemoryEmbeddings(): Promise<number> {
  const db = coachDb()

  const { data } = await db
    .from('coach_memory')
    .select('id, content')
    .is('embedding', null)
    .limit(200)

  let count = 0
  for (const row of (data ?? []) as { id: string; content: string }[]) {
    const embedding = await embedText(row.content, 'document')
    if (!embedding) continue

    await db.from('coach_memory').update({ embedding: toVectorLiteral(embedding) }).eq('id', row.id)
    count++
  }

  return count
}
