import type { UIMessage } from 'ai'

import type { CoachConversationListItem } from '@/lib/types/coach-ui.types'

export const ACTIVE_CONVERSATION_KEY = 'petecoach.activeConversationId'

export const STARTERS = [
  { label: 'The race', text: 'How is the sub-3 goal tracking against the knee?' },
  { label: 'The knee', text: 'My knee felt tight after yesterday. Should I change this week?' },
  { label: 'The water', text: 'Why is my swim pace stuck, and what is the next lever?' },
  { label: 'Tomorrow', text: 'What should I do about the wind tomorrow?' },
] as const

const TOOL_LABELS: Record<string, string> = {
  get_athlete_profile: 'profile',
  get_injury_status: 'injury record',
  query_activities: 'training log',
  get_activity_detail: 'session detail',
  get_daily_metrics: 'health metrics',
  get_training_load: 'training load',
  get_readiness: 'readiness',
  get_plan: 'the plan',
  recall: 'memory',
  search_knowledge: 'the library',
  search_pubmed: 'PubMed',
  get_weather: 'weather',
  get_lake_conditions: 'the lake',
  get_calendar: 'calendar',
  project_race: 'race projection',
  compute_zones: 'zones',
  get_benchmarks: 'benchmarks',
  get_gear: 'gear',
  get_nutrition_targets: 'fuelling',
  get_pt_protocol: 'PT protocol',
  propose_plan_change: 'plan change',
  log_symptom: 'symptom log',
  log_feedback: 'session feedback',
  remember: 'noted for later',
}

export function newConversationId(): string {
  return crypto.randomUUID()
}

export function readActiveConversationId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CONVERSATION_KEY)
  } catch {
    return null
  }
}

export function writeActiveConversationId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, id)
    else window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY)
  } catch {
    // Private mode or blocked storage should not break the thread.
  }
}

export function asUiMessages(raw: unknown): UIMessage[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((message): message is UIMessage => {
    if (!message || typeof message !== 'object') return false
    const record = message as { id?: unknown; role?: unknown }
    return typeof record.id === 'string' && typeof record.role === 'string'
  })
}

export function extractText(message: UIMessage | { parts?: { type: string; text?: string }[] }): string {
  const parts = message.parts ?? []
  return parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && Boolean(part.text))
    .map((part) => part.text)
    .join('')
    .trim()
}

export function toolLabels(message: UIMessage): string[] {
  const seen = new Set<string>()
  const labels: string[] = []

  for (const part of message.parts ?? []) {
    const type = part.type
    if (typeof type !== 'string' || !type.startsWith('tool-')) continue
    const name = type.replace(/^tool-/, '').replace(/-/g, '_')
    const label = TOOL_LABELS[name] ?? name.replace(/_/g, ' ')
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }

  return labels
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const delta = Date.now() - then
  const minutes = Math.round(delta / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function threadTitle(thread: CoachConversationListItem): string {
  const title = thread.title?.trim()
  return title && title.length > 0 ? title : 'Untitled session'
}

type ThreadGroup = { label: string; items: CoachConversationListItem[] }

export function groupThreads(threads: CoachConversationListItem[]): ThreadGroup[] {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayMs = startOfToday.getTime()
  const weekMs = todayMs - 6 * 86_400_000

  const today: ThreadGroup = { label: 'Today', items: [] }
  const thisWeek: ThreadGroup = { label: 'This week', items: [] }
  const earlier: ThreadGroup = { label: 'Earlier', items: [] }

  for (const thread of threads) {
    const stamp = new Date(thread.last_message_at ?? thread.created_at).getTime()
    if (stamp >= todayMs) today.items.push(thread)
    else if (stamp >= weekMs) thisWeek.items.push(thread)
    else earlier.items.push(thread)
  }

  return [today, thisWeek, earlier].filter((group) => group.items.length > 0)
}
