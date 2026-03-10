/**
 * AI Chef Chat API
 * POST - Streaming chat with the AI Chef
 * Uses Vercel AI SDK streamText with tool calling, message metadata,
 * chat persistence, and disconnect resilience.
 */

import { config } from '@/lib/config'
import {
  assembleContext,
  assembleRecipeContext,
  createChatStream,
  createFitnessPlanStream,
  createRecipeChatStream,
  findCandidateRecipes,
  getRecentRecipeIds,
  isFitnessMealPlanRequest,
  isFitnessProfileTrigger,
  loadFitnessProfile,
  parseFitnessGuidelines,
  saveChatMessages,
  saveFitnessProfile,
} from '@/lib/services/ai-chef.service'
import type { UIMessage } from 'ai'
import { NextRequest } from 'next/server'

export const maxDuration = 60

function extractTextFromMessage(msg: UIMessage | undefined): string {
  if (!msg) return ''
  return (
    msg.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ') || ''
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!config.aiCoach.isConfigured) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI Chef is not configured. Set ANTHROPIC_API_KEY.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { messages, chatId, recipeId }: { messages: UIMessage[]; chatId?: string; recipeId?: string } =
      await request.json()

    let result

    if (recipeId) {
      const recipeContext = await assembleRecipeContext(recipeId)
      result = await createRecipeChatStream(messages, recipeContext, recipeId)
    } else {
      // Check for fitness meal planning flow
      const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
      const msgText = extractTextFromMessage(lastUserMsg)

      const savedProfile = await loadFitnessProfile()
      const isProfileTrigger = savedProfile && isFitnessProfileTrigger(msgText)
      const isInlineFitness = isFitnessMealPlanRequest(msgText)

      if (isProfileTrigger || isInlineFitness) {
        console.log(`[AI Chef] Fitness pipeline activated: ${isProfileTrigger ? 'saved profile' : 'inline parse'}`)

        const guidelines = isProfileTrigger
          ? savedProfile!.guidelines
          : await parseFitnessGuidelines(msgText)

        if (isInlineFitness) {
          saveFitnessProfile(guidelines).catch((err) =>
            console.error('[AI Chef] Failed to save fitness profile:', err)
          )
        }

        const recentIds = await getRecentRecipeIds()
        const candidates = await findCandidateRecipes(guidelines.days, recentIds)
        result = await createFitnessPlanStream(candidates, guidelines, messages)
      } else {
        const systemContext = await assembleContext()
        result = await createChatStream(messages, systemContext)
      }
    }

    return result.toUIMessageStreamResponse({
      originalMessages: messages,

      onError: (error: unknown) => {
        if (error instanceof Error) return error.message
        if (typeof error === 'string') return error
        return 'An unexpected error occurred in the AI Chef.'
      },

      messageMetadata: ({ part }) => {
        if (part.type === 'start') {
          return {
            createdAt: Date.now(),
            model: config.aiCoach.defaultModel,
          }
        }
        if (part.type === 'finish') {
          return {
            totalTokens: part.totalUsage?.totalTokens,
            finishReason: part.finishReason,
          }
        }
        return undefined
      },

      onFinish: ({ messages: finalMessages }) => {
        if (chatId) {
          saveChatMessages(chatId, finalMessages).catch((err) =>
            console.error('[AI Chef] Failed to persist chat:', err)
          )
        }
      },
    })
  } catch (error) {
    console.error('Error in AI Chef chat:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
