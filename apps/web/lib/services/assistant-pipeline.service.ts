/**
 * Assistant Pipeline Service (Option D2)
 * load_memory → router → chef | coach | fitness_plan; returns stream + intent.
 */

import type { UIMessage } from 'ai'

import {
  assembleContext as assembleChefContext,
  createChatStream as createChefChatStream,
  createFitnessPlanStream,
  findCandidateRecipes,
  getRecentRecipeIds,
  isFitnessMealPlanRequest,
  isFitnessProfileTrigger,
  loadFitnessProfile,
  parseFitnessGuidelines,
  saveFitnessProfile,
} from '@/lib/services/ai-chef.service'
import {
  assembleContext as assembleCoachContext,
  createChatStream as createCoachChatStream,
  getFitnessRoutineSummaryForMealPlanning,
} from '@/lib/services/ai-coach.service'
import { loadMemory } from '@/lib/services/assistant-memory.service'
import { getHasFitnessProfile, route, type AssistantIntent } from '@/lib/services/assistant-router.service'

const MEDICAL_DISCLAIMER =
  'This assistant provides fitness and nutrition guidance only. It is not a substitute for professional medical advice; consult a healthcare provider for medical decisions.'

function extractTextFromMessage(msg: UIMessage | undefined): string {
  if (!msg) return ''
  return (
    msg.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ') || ''
  )
}

export interface RunPipelineInput {
  messages: UIMessage[]
  chatId?: string
  userId?: string | null
}

export type RunPipelineResult =
  | { stream: Awaited<ReturnType<typeof createFitnessPlanStream>>; intent: 'fitness_plan' }
  | { stream: Awaited<ReturnType<typeof createChefChatStream>>; intent: 'chef' }
  | { stream: Awaited<ReturnType<typeof createCoachChatStream>>; intent: 'coach' }

/**
 * Run the assistant pipeline: load_memory → route → agent (chef | coach | fitness_plan).
 * Returns the stream and intent for the route to return and for onFinish (digest).
 */
export async function runPipeline(input: RunPipelineInput): Promise<RunPipelineResult> {
  const { messages, userId } = input

  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
  const lastUserText = extractTextFromMessage(lastUserMsg)

  // Load memory (degrade to '' on failure)
  let memoryBlob = ''
  try {
    memoryBlob = await loadMemory(userId ?? undefined)
  } catch (err) {
    console.error('[Assistant] loadMemory failed:', err)
  }

  // Router
  const hasFitnessProfile = await getHasFitnessProfile()
  const intent = await route(lastUserText, hasFitnessProfile)

  if (intent === 'fitness_plan') {
    const savedProfile = await loadFitnessProfile()
    const isProfileTrigger = savedProfile && isFitnessProfileTrigger(lastUserText)
    const isInlineFitness = isFitnessMealPlanRequest(lastUserText)

    const guidelines = isProfileTrigger
      ? savedProfile!.guidelines
      : await parseFitnessGuidelines(lastUserText)

    if (isInlineFitness) {
      saveFitnessProfile(guidelines).catch((err) =>
        console.error('[Assistant] Failed to save fitness profile:', err)
      )
    }

    const recentIds = await getRecentRecipeIds()
    const candidates = await findCandidateRecipes(guidelines.days, recentIds)
    const stream = await createFitnessPlanStream(candidates, guidelines, messages)
    return { stream, intent: 'fitness_plan' }
  }

  if (intent === 'chef') {
    let chefContext = ''
    try {
      chefContext = await assembleChefContext()
    } catch (err) {
      console.error('[Assistant] assembleChefContext failed:', err)
    }
    let fitnessSummary = ''
    try {
      fitnessSummary = await getFitnessRoutineSummaryForMealPlanning()
    } catch (err) {
      console.error('[Assistant] getFitnessRoutineSummaryForMealPlanning failed:', err)
    }
    const systemContext = [memoryBlob, MEDICAL_DISCLAIMER, fitnessSummary, chefContext]
      .filter(Boolean)
      .join('\n\n')
    const stream = await createChefChatStream(messages, systemContext)
    return { stream, intent: 'chef' }
  }

  // coach
  let coachContext = ''
  try {
    coachContext = await assembleCoachContext()
  } catch (err) {
    console.error('[Assistant] assembleCoachContext failed:', err)
    coachContext = 'Coach data temporarily unavailable; answering from general context.'
  }
  const coachSystemContext = [memoryBlob, MEDICAL_DISCLAIMER, coachContext].filter(Boolean).join('\n\n')
  const stream = await createCoachChatStream(messages, coachSystemContext)
  return { stream, intent: 'coach' }
}
