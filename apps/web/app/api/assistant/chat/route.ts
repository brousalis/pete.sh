/**
 * Assistant Chat API
 * POST - Streaming chat with the unified assistant (load_memory → router → chef | coach | fitness_plan).
 * When chatId is omitted, uses latest conversation or creates a new one (single never-ending conversation).
 */

import { NextRequest } from 'next/server'
import type { UIMessage } from 'ai'
import { randomUUID } from 'crypto'
import { config } from '@/lib/config'
import { runDigest } from '@/lib/services/assistant-digest.service'
import {
  getLatestAssistantChatId,
  saveAssistantChatMessages,
  saveMemoryFromDigest,
} from '@/lib/services/assistant-memory.service'
import { runPipeline } from '@/lib/services/assistant-pipeline.service'

export const maxDuration = 60

function hasUserMessage(messages: UIMessage[]): boolean {
  return messages.some((m) => m.role === 'user')
}

export async function POST(request: NextRequest) {
  try {
    if (!config.aiCoach.isConfigured) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Assistant is not configured. Set ANTHROPIC_API_KEY.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const messages = body.messages as UIMessage[] | undefined
    const chatIdFromBody = body.chatId as string | undefined
    const userId = body.userId as string | null | undefined

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ success: false, error: 'messages must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (!hasUserMessage(messages)) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one user message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Single never-ending conversation: resolve to latest or new
    const resolvedChatId =
      chatIdFromBody ||
      (await getLatestAssistantChatId(userId ?? undefined)) ||
      randomUUID()

    const { stream, intent } = await runPipeline({
      messages,
      chatId: resolvedChatId,
      userId,
    })

    const res = await stream.toUIMessageStreamResponse({
      originalMessages: messages,

      onError: (error: unknown) => {
        if (error instanceof Error) return error.message
        if (typeof error === 'string') return error
        return 'Something went wrong with the assistant.'
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
        saveAssistantChatMessages(resolvedChatId, finalMessages, userId).catch((err) =>
          console.error('[Assistant] Failed to persist chat:', err)
        )
        return runDigest(finalMessages, intent)
          .then((digest) => {
            if (digest) {
              return saveMemoryFromDigest(userId ?? null, digest)
            }
            return undefined
          })
          .catch((err) => console.error('[Assistant] Digest/saveMemory failed:', err))
      },
    })

    // So the client can sync chatId (e.g. after first message when none existed)
    const headers = new Headers(res.headers)
    headers.set('X-Assistant-Chat-Id', resolvedChatId)
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    })
  } catch (error) {
    console.error('[Assistant] Chat error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
