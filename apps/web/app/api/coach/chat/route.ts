/**
 * POST /api/coach/chat — streaming conversation with petehome
 *
 * Replaces /api/fitness/ai-coach/chat. Differences that matter:
 *   - The system prompt is split into a cached prefix and a trimmed volatile
 *     context, instead of one uncached 15–35k-token block per turn.
 *   - Model, context size and step limit come from the cost governor.
 *   - Older turns are folded into a rolling summary rather than replayed.
 *   - Durable facts are extracted into memory after the response is sent.
 */

import { NextRequest } from 'next/server'
import type { UIMessage } from 'ai'

import { config } from '@/lib/config'
import {
  digestConversation,
  getOrCreateConversation,
  maybeSummarise,
  saveMessages,
  setConversationDeepMode,
} from '@/lib/services/coach/conversation.service'
import { getCostGovernor } from '@/lib/services/coach/cost.service'
import {
  buildCoachContext,
  buildSystemMessages,
  resolveModel,
} from '@/lib/services/coach/runtime.service'
import { buildCoachTools } from '@/lib/services/coach/tools.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Tool loops on a weekly-plan question can legitimately run long. Vercel Pro
// allows up to 300s; the old 60s limit truncated multi-step planning.
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    if (!config.coach.isConfigured) {
      return jsonError('petehome is not configured. Set ANTHROPIC_API_KEY.', 503)
    }

    const body = (await request.json()) as {
      messages: UIMessage[]
      conversationId?: string
      deepMode?: boolean
    }

    const { messages } = body
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError('No messages supplied.', 400)
    }

    const conversation = await getOrCreateConversation(body.conversationId)
    const deepMode = body.deepMode ?? conversation.deepMode
    if (body.deepMode !== undefined && body.deepMode !== conversation.deepMode) {
      await setConversationDeepMode(conversation.id, body.deepMode)
    }

    const governor = getCostGovernor()
    const plan = await governor.resolvePlan('chat', { deepMode })

    // When the budget is exhausted, say so rather than quietly producing a
    // worse answer with no explanation.
    if (plan.useTemplateFallback) {
      return jsonError(
        `The monthly Claude budget is exhausted (${plan.reason}). Scheduled briefings continue from computed analytics, but chat is paused until the budget resets or the cap is raised in Settings.`,
        429
      )
    }

    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    const focus = lastUserMessage ? extractText(lastUserMessage) : undefined

    const parts = await buildCoachContext({
      focus,
      budgetTokens: plan.contextBudgetTokens,
      conversationSummary: conversation.summary,
      includeKnowledge: plan.budgetState === 'normal',
    })

    const { runId, settle } = await governor.beginStreamingRun({
      job: 'chat',
      plan,
      conversationId: conversation.id,
    })

    const { streamText, stepCountIs, convertToModelMessages } = await import('ai')

    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: resolveModel(plan),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [...buildSystemMessages(parts, 'chat', plan), ...modelMessages] as any,
      tools: buildCoachTools(),
      stopWhen: stepCountIs(plan.maxSteps),
      maxOutputTokens: 4000,

      onFinish: async (event) => {
        try {
          const { usageFromAiSdk } = await import('@petehome/coach-core')
          await settle({
            usage: usageFromAiSdk(
              event.totalUsage,
              event.providerMetadata as Record<string, unknown>
            ),
          })
        } catch (error) {
          console.error('[coach] Failed to record chat spend:', error)
        }
      },
    })

    const stream = result.toUIMessageStreamResponse({
      originalMessages: messages,

      onError: (error: unknown) => {
        if (error instanceof Error) return error.message
        if (typeof error === 'string') return error
        return 'petehome hit an unexpected error.'
      },

      messageMetadata: ({ part }) => {
        if (part.type === 'start') {
          return {
            conversationId: conversation.id,
            createdAt: Date.now(),
            model: plan.modelId,
            budgetState: plan.budgetState,
            deepMode,
            contextTokens: parts.usedTokens,
            droppedSections: parts.droppedSections,
          }
        }
        if (part.type === 'finish') {
          return { totalTokens: part.totalUsage?.totalTokens, finishReason: part.finishReason }
        }
        return undefined
      },

      onFinish: ({ messages: finalMessages }) => {
        // Persistence, summarisation and memory extraction run after the
        // response is delivered so none of them add latency to the reply.
        void (async () => {
          try {
            await saveMessages(conversation.id, finalMessages, runId)
            await maybeSummarise(conversation.id)
            await digestConversation(conversation.id, finalMessages)
          } catch (error) {
            console.error('[coach] Post-turn processing failed:', error)
          }
        })()
      },
    })

    const headers = new Headers(stream.headers)
    headers.set('X-Conversation-Id', conversation.id)
    return new Response(stream.body, { status: stream.status, headers })
  } catch (error) {
    console.error('[coach] Chat failed:', error)
    return jsonError(error instanceof Error ? error.message : 'Unknown error', 500)
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function extractText(message: UIMessage): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (message as any).parts as { type: string; text?: string }[] | undefined
  if (!parts) return ''
  return parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text!)
    .join(' ')
    .trim()
}
