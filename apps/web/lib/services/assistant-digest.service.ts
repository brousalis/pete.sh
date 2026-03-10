/**
 * Assistant Digest Service
 * Extracts user-stated facts from the last exchange for update_memory.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'

import { config } from '@/lib/config'
import {
  MemoryDigestSchema,
  type MemoryDigest,
} from '@/lib/services/assistant-memory.service'

const MIN_USER_MESSAGE_LENGTH = 10

function getHaikuModel() {
  const apiKey = config.aiCoach.anthropicApiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const anthropic = createAnthropic({ apiKey })
  return anthropic('claude-haiku-4-5-20251001')
}

function extractTextFromMessage(msg: UIMessage | undefined): string {
  if (!msg) return ''
  return (
    msg.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ') || ''
  )
}

/**
 * Run digest on the last exchange. Returns null if nothing to store or if skipped.
 * Caller should call saveMemoryFromDigest(userId, result) when result is non-null.
 */
export async function runDigest(
  messages: UIMessage[],
  intent: 'chef' | 'coach' | 'fitness_plan'
): Promise<MemoryDigest | null> {
  if (!config.aiCoach.isConfigured) return null

  const userMessages = messages.filter((m) => m.role === 'user')
  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  const lastUser = userMessages[userMessages.length - 1]
  const lastAssistant = assistantMessages[assistantMessages.length - 1]

  const lastUserText = extractTextFromMessage(lastUser)
  const lastAssistantText = extractTextFromMessage(lastAssistant)

  // Skip trivial exchanges
  if (lastUserText.length < MIN_USER_MESSAGE_LENGTH) {
    return null
  }
  // Optionally skip fitness_plan (no user facts expected)
  if (intent === 'fitness_plan') {
    return null
  }

  const model = getHaikuModel()
  if (!model) return null

  try {
    const { experimental_output } = await generateText({
      model,
      output: Output.object({ schema: MemoryDigestSchema }),
      system: `Extract only facts the USER stated about their goals, dietary preferences, injury/health notes, or other preferences. Do NOT store suggestions the assistant made that the user merely agreed to. Do NOT store generic small talk. Omit all fields if nothing new or factual. Return empty arrays when there is nothing to store. For preferencePairs use an array of { key: string, value: string } (e.g. [{ key: "cuisine", value: "Italian" }]).`,
      prompt: `Last user message:\n${lastUserText}\n\nLast assistant message:\n${lastAssistantText}\n\nExtract any new or updated user-stated facts.`,
    })

    if (!experimental_output) return null

    const parsed = MemoryDigestSchema.safeParse(experimental_output)
    if (!parsed.success) return null

    const d = parsed.data
    const hasGoals = d.goals && d.goals.length > 0
    const hasDietary = d.dietaryNotes && d.dietaryNotes.length > 0
    const hasInjury = d.injuryUpdates && d.injuryUpdates.length > 0
    const hasPrefs = d.preferencePairs && d.preferencePairs.length > 0
    const hasOther = d.otherFacts && d.otherFacts.length > 0

    if (!hasGoals && !hasDietary && !hasInjury && !hasPrefs && !hasOther) {
      return null
    }

    return d
  } catch (err) {
    console.error('[Assistant] runDigest failed:', err)
    return null
  }
}
