/**
 * Conversation persistence and rolling summarisation.
 *
 * The old coach stored the whole UIMessage array in one JSONB column and
 * replayed the last 30 messages every turn, with no memory across
 * conversations and a 30-day cleanup. Over a 48-week season that loses the
 * training relationship repeatedly.
 *
 * Here each message is its own row, older turns are folded into a rolling
 * summary, and nothing is ever auto-deleted.
 */

import type { UIMessage } from 'ai'
import {
  CONVERSATION_SUMMARY_PROMPT,
  MEMORY_DIGEST_PROMPT,
  SESSION_TITLE_PROMPT,
  shouldSummarise,
  VERBATIM_MESSAGE_WINDOW,
} from '@petehome/coach-core'

import { sessionTitleFromPrompt } from '@/lib/utils/session-title'

import { coachDb } from './coach-data.service'
import { remember } from './memory.service'

export interface ConversationState {
  id: string
  title: string | null
  summary: string | null
  summaryThroughMessage: number
  messageCount: number
  deepMode: boolean
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function toConversationState(data: {
  id: string
  title: string | null
  summary: string | null
  summary_through_message: number | null
  message_count: number | null
  deep_mode: boolean | null
}): ConversationState {
  return {
    id: data.id,
    title: data.title,
    summary: data.summary,
    summaryThroughMessage: data.summary_through_message ?? 0,
    messageCount: data.message_count ?? 0,
    deepMode: Boolean(data.deep_mode),
  }
}

export async function getOrCreateConversation(
  conversationId?: string
): Promise<ConversationState> {
  const db = coachDb()

  const requestedId = conversationId && isUuid(conversationId) ? conversationId : undefined

  if (requestedId) {
    const { data } = await db
      .from('coach_conversation')
      .select('*')
      .eq('id', requestedId)
      .maybeSingle()

    if (data) return toConversationState(data)

    const { data: created, error } = await db
      .from('coach_conversation')
      .insert({ id: requestedId, title: null })
      .select('*')
      .single()

    if (!error && created) return toConversationState(created)

    // A parallel first send can win the insert; reuse that row instead of failing.
    const { data: raced } = await db
      .from('coach_conversation')
      .select('*')
      .eq('id', requestedId)
      .maybeSingle()

    if (raced) return toConversationState(raced)
    throw new Error(`Failed to create conversation: ${error?.message ?? 'unknown error'}`)
  }

  const { data, error } = await db
    .from('coach_conversation')
    .insert({ title: null })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)

  return toConversationState(data)
}

export async function setConversationDeepMode(
  conversationId: string,
  deepMode: boolean
): Promise<void> {
  await coachDb().from('coach_conversation').update({ deep_mode: deepMode }).eq('id', conversationId)
}

/** Recent messages verbatim; everything older lives in the summary. */
export async function getRecentMessages(
  conversationId: string,
  limit = VERBATIM_MESSAGE_WINDOW
): Promise<UIMessage[]> {
  const { data } = await coachDb()
    .from('coach_message')
    .select('content, seq')
    .eq('conversation_id', conversationId)
    .order('seq', { ascending: false })
    .limit(limit)

  return ((data ?? []) as { content: UIMessage; seq: number }[])
    .sort((a, b) => a.seq - b.seq)
    .map((row) => row.content)
}

export async function saveMessages(
  conversationId: string,
  messages: UIMessage[],
  agentRunId?: string | null
): Promise<void> {
  const db = coachDb()

  const { data: existing } = await db
    .from('coach_message')
    .select('seq')
    .eq('conversation_id', conversationId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()

  let seq = (existing?.seq ?? 0) + 1

  // Only persist messages that are not already stored. The client resends the
  // whole thread, so matching on id avoids duplicating history every turn.
  const { data: storedIds } = await db
    .from('coach_message')
    .select('content')
    .eq('conversation_id', conversationId)

  const known = new Set(
    ((storedIds ?? []) as { content: { id?: string } }[])
      .map((row) => row.content?.id)
      .filter(Boolean)
  )

  const rows = messages
    .filter((message) => !known.has(message.id))
    .map((message) => ({
      conversation_id: conversationId,
      seq: seq++,
      role: message.role,
      content: message,
      agent_run_id: agentRunId ?? null,
    }))

  if (rows.length === 0) return

  const { error } = await db.from('coach_message').insert(rows)
  if (error) {
    console.error('[coach] Failed to save messages:', error.message)
    return
  }

  const title = await deriveTitle(conversationId, messages)

  await db
    .from('coach_conversation')
    .update({
      message_count: seq - 1,
      last_message_at: new Date().toISOString(),
      ...(title ? { title } : {}),
    })
    .eq('id', conversationId)
}

async function deriveTitle(
  conversationId: string,
  messages: UIMessage[]
): Promise<string | null> {
  const { data } = await coachDb()
    .from('coach_conversation')
    .select('title')
    .eq('id', conversationId)
    .maybeSingle()

  if (data?.title) return null

  const firstUser = messages.find((message) => message.role === 'user')
  if (!firstUser) return null

  const text = extractText(firstUser)
  if (!text) return null

  const fallback = sessionTitleFromPrompt(text)

  try {
    const { generateText } = await import('ai')
    const { anthropic } = await import('@ai-sdk/anthropic')
    const { MODELS, usageFromAiSdk, calculateCost } = await import('@petehome/coach-core')

    const result = await generateText({
      model: anthropic(MODELS.fast.id),
      system: SESSION_TITLE_PROMPT,
      prompt: text.slice(0, 600),
      maxOutputTokens: 24,
    })

    const cleaned = cleanGeneratedTitle(result.text) ?? fallback

    const usage = usageFromAiSdk(result.usage, result.providerMetadata as Record<string, unknown>)
    await coachDb()
      .from('coach_agent_run')
      .insert({
        job: 'digest',
        model: MODELS.fast.id,
        conversation_id: conversationId,
        finished_at: new Date().toISOString(),
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        cost_usd: calculateCost('fast', usage),
        status: 'success',
        budget_state: 'normal',
      })

    return cleaned
  } catch (error) {
    console.error('[coach] Title derivation failed:', error)
    return fallback
  }
}

function cleanGeneratedTitle(raw: string): string | null {
  const line = raw
    .split('\n')[0]
    ?.trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.?!]+$/, '')
    .trim()

  if (!line || line.length < 2 || line.length > 60) return null
  return line.charAt(0).toUpperCase() + line.slice(1)
}

export function extractText(message: UIMessage): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (message as any).parts as { type: string; text?: string }[] | undefined
  if (!parts) return ''

  return parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text!)
    .join(' ')
    .trim()
}

/**
 * Fold older turns into a rolling summary when the thread grows.
 *
 * Runs on the fast model: this is compression, not coaching.
 */
export async function maybeSummarise(conversationId: string): Promise<boolean> {
  const db = coachDb()

  const { data: conversation } = await db
    .from('coach_conversation')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conversation) return false

  const messageCount = conversation.message_count ?? 0
  const summarisedThrough = conversation.summary_through_message ?? 0

  if (!shouldSummarise(messageCount, summarisedThrough)) return false

  const cutoff = messageCount - VERBATIM_MESSAGE_WINDOW
  if (cutoff <= summarisedThrough) return false

  const { data: messages } = await db
    .from('coach_message')
    .select('role, content, seq')
    .eq('conversation_id', conversationId)
    .lte('seq', cutoff)
    .gt('seq', summarisedThrough)
    .order('seq', { ascending: true })

  if (!messages?.length) return false

  const transcript = (messages as { role: string; content: UIMessage }[])
    .map((row) => `${row.role}: ${extractText(row.content)}`)
    .filter((line) => line.length > 6)
    .join('\n')

  if (transcript.length < 200) return false

  try {
    const { generateText } = await import('ai')
    const { anthropic } = await import('@ai-sdk/anthropic')
    const { MODELS, usageFromAiSdk, calculateCost } = await import('@petehome/coach-core')

    const previous = conversation.summary
      ? `Existing summary of earlier turns:\n${conversation.summary}\n\n`
      : ''

    const result = await generateText({
      model: anthropic(MODELS.fast.id),
      system: CONVERSATION_SUMMARY_PROMPT,
      prompt: `${previous}New turns to fold in:\n${transcript}`,
      maxOutputTokens: 600,
    })

    await db
      .from('coach_conversation')
      .update({
        summary: result.text,
        summary_through_message: cutoff,
      })
      .eq('id', conversationId)

    // Recorded for the spend panel; summarisation is cheap but not free.
    const usage = usageFromAiSdk(result.usage, result.providerMetadata as Record<string, unknown>)
    await db.from('coach_agent_run').insert({
      job: 'digest',
      model: MODELS.fast.id,
      conversation_id: conversationId,
      finished_at: new Date().toISOString(),
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: calculateCost('fast', usage),
      status: 'success',
      budget_state: 'normal',
    })

    return true
  } catch (error) {
    console.error('[coach] Summarisation failed:', error)
    return false
  }
}

/**
 * Extract durable memories from a finished exchange.
 *
 * Runs on the fast model after the response has been delivered, so it never
 * adds latency to the conversation.
 */
export async function digestConversation(
  conversationId: string,
  messages: UIMessage[]
): Promise<number> {
  const recent = messages.slice(-6)
  const transcript = recent
    .map((message) => `${message.role}: ${extractText(message)}`)
    .filter((line) => line.length > 10)
    .join('\n')

  if (transcript.length < 150) return 0

  try {
    const { generateObject } = await import('ai')
    const { anthropic } = await import('@ai-sdk/anthropic')
    const { z } = await import('zod')
    const { MODELS } = await import('@petehome/coach-core')

    const result = await generateObject({
      model: anthropic(MODELS.fast.id),
      schema: z.object({
        memories: z.array(
          z.object({
            content: z.string().min(10).max(400),
            memoryType: z.enum(['fact', 'preference', 'episode', 'insight']),
            tags: z.array(z.string()).max(6),
            confidence: z.number().min(0).max(1),
          })
        ),
      }),
      system: MEMORY_DIGEST_PROMPT,
      prompt: transcript,
      maxOutputTokens: 800,
    })

    let stored = 0
    for (const memory of result.object.memories) {
      await remember({
        content: memory.content,
        memoryType: memory.memoryType,
        tags: memory.tags,
        confidence: memory.confidence,
        source: 'digest',
        conversationId,
      })
      stored++
    }

    return stored
  } catch (error) {
    console.error('[coach] Memory digest failed:', error)
    return 0
  }
}

export async function listConversations(limit = 30) {
  const { data } = await coachDb()
    .from('coach_conversation')
    .select('id, title, message_count, last_message_at, created_at, deep_mode')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  return data ?? []
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await coachDb()
    .from('coach_conversation')
    .delete()
    .eq('id', conversationId)

  if (error) throw new Error(`Failed to delete conversation: ${error.message}`)
}
