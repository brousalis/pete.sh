/**
 * AI Chef Chat API
 * POST - Streaming chat with the AI Chef
 * Uses Vercel AI SDK streamText with tool calling, message metadata,
 * chat persistence, and disconnect resilience.
 */

import { NextRequest } from 'next/server'
import type { UIMessage } from 'ai'
import {
  assembleContext,
  createChatStream,
  saveChatMessages,
} from '@/lib/services/ai-chef.service'
import { config } from '@/lib/config'

export const maxDuration = 60

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

    const { messages, chatId }: { messages: UIMessage[]; chatId?: string } =
      await request.json()

    const systemContext = await assembleContext()

    const result = await createChatStream(messages, systemContext)

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
