/**
 * Assistant Router Service
 * Classifies user intent: fitness_plan (reuse chef triggers) or chef vs coach (Haiku).
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { config } from '@/lib/config'
import {
  isFitnessMealPlanRequest,
  isFitnessProfileTrigger,
  loadFitnessProfile,
} from '@/lib/services/ai-chef.service'

const ROUTER_MESSAGE_MAX_CHARS = 500

export type AssistantIntent = 'chef' | 'coach' | 'fitness_plan'

const RouterOutputSchema = z.object({
  intent: z.enum(['chef', 'coach']),
})

function getHaikuModel() {
  const apiKey = config.aiCoach.anthropicApiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  const anthropic = createAnthropic({ apiKey })
  return anthropic('claude-haiku-4-5-20251001')
}

/**
 * Route the last user message to chef, coach, or fitness_plan.
 * - fitness_plan: reuse AI Chef triggers (profile trigger or inline fitness request).
 * - chef vs coach: Haiku classify on truncated last message.
 */
export async function route(
  lastUserMessage: string,
  hasFitnessProfile: boolean
): Promise<AssistantIntent> {
  const trimmed = lastUserMessage.trim()
  if (trimmed.length === 0) {
    return 'coach'
  }

  // Fitness plan branch (no LLM)
  if (hasFitnessProfile && isFitnessProfileTrigger(trimmed)) {
    return 'fitness_plan'
  }
  if (isFitnessMealPlanRequest(trimmed)) {
    return 'fitness_plan'
  }

  // Chef vs coach: Haiku classifier
  if (!config.aiCoach.isConfigured) {
    return 'coach'
  }

  const input = trimmed.length > ROUTER_MESSAGE_MAX_CHARS
    ? trimmed.slice(0, ROUTER_MESSAGE_MAX_CHARS) + '...'
    : trimmed

  try {
    const model = getHaikuModel()
    const { experimental_output } = await generateText({
      model,
      output: Output.object({ schema: RouterOutputSchema }),
      system: `Classify the user message into exactly one: chef = meals, recipes, cooking, food, dinner, ingredients; coach = workout, routine, fitness, health, recovery, injury, HRV, deload, exercises. Reply with only the intent.`,
      prompt: `User message:\n\n${input}\n\nIntent (chef or coach):`,
    })

    const intent = experimental_output?.intent ?? 'coach'
    return intent
  } catch (err) {
    console.error('[Assistant] Router classifier failed:', err)
    return 'coach'
  }
}

/**
 * Resolve whether the user has a saved fitness profile (for fitness_plan trigger).
 */
export async function getHasFitnessProfile(): Promise<boolean> {
  try {
    const profile = await loadFitnessProfile()
    return profile != null
  } catch {
    return false
  }
}
