/**
 * Assistant Memory Service
 * Load/save persistent user memory (assistant_user_memory) and assistant conversation persistence.
 */

import type { UIMessage } from 'ai'
import { z } from 'zod'

import { getSupabaseClientForOperation } from '@/lib/supabase/client'

// ============================================
// MEMORY DIGEST (for update_memory / digest step)
// ============================================

// preferences as array of pairs (Anthropic rejects record/additionalProperties in object schema)
export const MemoryDigestSchema = z.object({
  goals: z.array(z.string()).optional(),
  dietaryNotes: z.array(z.string()).optional(),
  injuryUpdates: z.array(z.string()).optional(),
  preferencePairs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  otherFacts: z.array(z.string()).optional(),
})

export type MemoryDigest = z.infer<typeof MemoryDigestSchema>

const MEMORY_BLOB_MAX_CHARS = 6000 // ~2k tokens

// ============================================
// LOAD MEMORY (for pipeline system context)
// ============================================

export async function loadMemory(userId?: string | null): Promise<string> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return ''

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const query = db.from('assistant_user_memory').select('key, value').order('key')

    if (userId != null && userId !== '') {
      query.eq('user_id', userId)
    } else {
      query.is('user_id', null)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return 'No persistent context yet.'
    }

    const sections: string[] = ['## Persistent user context (use when relevant)\n']

    const goals: string[] = []
    const dietary: string[] = []
    const injury: string[] = []
    const other: string[] = []

    for (const row of data as { key: string; value: unknown }[]) {
      const k = row.key
      const v = row.value
      if (Array.isArray(v)) {
        const lines = v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        if (k === 'goals') goals.push(...lines)
        else if (k === 'dietary_notes') dietary.push(...lines)
        else if (k === 'injury_updates') injury.push(...lines)
        else other.push(...lines)
      } else if (typeof v === 'object' && v !== null) {
        other.push(`${k}: ${JSON.stringify(v)}`)
      } else {
        other.push(`${k}: ${String(v)}`)
      }
    }

    if (goals.length > 0) {
      sections.push('### Goals\n', goals.map((g) => `- ${g}`).join('\n'), '\n')
    }
    if (dietary.length > 0) {
      sections.push('### Dietary / preferences\n', dietary.map((d) => `- ${d}`).join('\n'), '\n')
    }
    if (injury.length > 0) {
      sections.push('### Injury / health notes\n', injury.map((i) => `- ${i}`).join('\n'), '\n')
    }
    if (other.length > 0) {
      sections.push('### Other\n', other.map((o) => `- ${o}`).join('\n'), '\n')
    }

    let blob = sections.join('').trim()
    if (blob.length > MEMORY_BLOB_MAX_CHARS) {
      blob = blob.slice(0, MEMORY_BLOB_MAX_CHARS) + '\n[...truncated]'
    }
    return blob || 'No persistent context yet.'
  } catch (err) {
    console.error('[Assistant] loadMemory failed:', err)
    return ''
  }
}

// ============================================
// SAVE MEMORY FROM DIGEST (last-write-wins per key)
// ============================================

export async function saveMemoryFromDigest(
  userId: string | null,
  updates: MemoryDigest
): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const uid = userId ?? null

  const rows: { user_id: string | null; key: string; value: unknown }[] = []

  if (updates.goals?.length) {
    rows.push({ user_id: uid, key: 'goals', value: updates.goals })
  }
  if (updates.dietaryNotes?.length) {
    rows.push({ user_id: uid, key: 'dietary_notes', value: updates.dietaryNotes })
  }
  if (updates.injuryUpdates?.length) {
    rows.push({ user_id: uid, key: 'injury_updates', value: updates.injuryUpdates })
  }
  const prefs =
    updates.preferencePairs && updates.preferencePairs.length > 0
      ? Object.fromEntries(updates.preferencePairs.map((p) => [p.key, p.value]))
      : null
  if (prefs && Object.keys(prefs).length > 0) {
    rows.push({ user_id: uid, key: 'preferences', value: prefs })
  }
  if (updates.otherFacts?.length) {
    rows.push({ user_id: uid, key: 'other_facts', value: updates.otherFacts })
  }

  for (const row of rows) {
    const { error } = await db
      .from('assistant_user_memory')
      .upsert(
        {
          user_id: row.user_id,
          key: row.key,
          value: row.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      )
    if (error) {
      console.error('[Assistant] saveMemoryFromDigest upsert error:', error)
    }
  }
}

// ============================================
// ASSISTANT CONVERSATION PERSISTENCE
// ============================================

export async function saveAssistantChatMessages(
  chatId: string,
  messages: UIMessage[],
  userId?: string | null
): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const firstUserMsg = messages.find((m) => m.role === 'user')
  const firstText = firstUserMsg?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
  const title = firstText
    ? firstText.length > 60
      ? firstText.slice(0, 57) + '...'
      : firstText
    : null

  const { data: existing } = await db
    .from('assistant_conversations')
    .select('title')
    .eq('id', chatId)
    .single()

  const upsertData: Record<string, unknown> = {
    id: chatId,
    messages: JSON.parse(JSON.stringify(messages)),
    updated_at: new Date().toISOString(),
  }
  if (userId != null) upsertData.user_id = userId
  if (!existing?.title && title) upsertData.title = title

  const { error } = await db
    .from('assistant_conversations')
    .upsert(upsertData, { onConflict: 'id' })

  if (error) {
    console.error('[Assistant] Error saving chat:', error)
  }
}

export async function loadAssistantChatMessages(chatId: string): Promise<UIMessage[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('assistant_conversations')
    .select('messages')
    .eq('id', chatId)
    .single()

  if (error || !data) return []
  return (data.messages as UIMessage[]) || []
}

export async function getLatestAssistantChatId(userId?: string | null): Promise<string | null> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  let query = db
    .from('assistant_conversations')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
  if (userId != null && userId !== '') {
    query = query.eq('user_id', userId)
  }
  const { data } = await query.single()
  return data?.id ?? null
}

export interface AssistantConversationSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: string
  createdAt: string
}

export async function listAssistantConversations(
  userId?: string | null
): Promise<AssistantConversationSummary[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  let query = db
    .from('assistant_conversations')
    .select('id, title, messages, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (userId != null && userId !== '') {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error || !data) return []

  return (data as { id: string; title: string | null; messages: UIMessage[]; created_at: string; updated_at: string }[]).map((row) => {
    const msgs = row.messages || []
    const firstUserMsg = msgs.find((m) => m.role === 'user')
    const firstText = firstUserMsg?.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { type: string; text?: string }) => p.text || '')
      .join(' ')
    const title = row.title || (firstText ? (firstText.length > 60 ? firstText.slice(0, 57) + '...' : firstText) : 'Untitled conversation')
    return {
      id: row.id,
      title,
      messageCount: msgs.length,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }
  })
}

export async function deleteAssistantConversation(chatId: string): Promise<boolean> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('assistant_conversations').delete().eq('id', chatId)

  if (error) {
    console.error('[Assistant] Error deleting conversation:', error)
    return false
  }
  return true
}
