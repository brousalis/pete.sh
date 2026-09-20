/**
 * Shapes returned by the /api/coach/* endpoints.
 *
 * Declared separately from the domain types in coach-core because the API
 * flattens and formats for display: durations arrive as minutes, guardrail
 * reports are reduced to what the UI renders.
 */

import type { GuardrailSeverity, ReadinessLevel, Sport } from '@petehome/coach-core'

export interface TodaySession {
  id: string
  /** Present on the plan endpoint, which returns sessions across a range. */
  sessionDate?: string
  slot: string
  sport: Sport
  type: string
  title: string
  description: string | null
  durationMinutes: number | null
  distanceMeters: number | null
  plannedLoad: number | null
  steps: Record<string, unknown>
  targets: {
    hrZone?: number
    hrRange?: [number, number]
    paceRange?: [number, number]
    cadenceRange?: [number, number]
    rpe?: number
  }
  rationale: string | null
  status: 'planned' | 'completed' | 'skipped' | 'modified' | 'cancelled'
  guardrail: {
    passed: boolean
    severity: GuardrailSeverity
    violations: { severity: GuardrailSeverity; message: string; remedy?: string }[]
  } | null
}

export interface PtProtocolView {
  id: string
  slug: string
  name: string
  timeOfDay: string
  durationMinutes: number | null
  mandatory: boolean
  completed: boolean
  skipped: boolean
  exercises: {
    name: string
    slug: string
    category: string
    prescription: Record<string, unknown>
    cues: string | null
  }[]
}

export interface ReadinessView {
  metricDate: string
  score: number
  level: ReadinessLevel
  components: { key: string; label: string; score: number; weight: number; detail: string }[]
  flags: string[]
  guidance: { action: string; summary: string }
}

export interface ConditionsView {
  summary: string
  temperatureF: number | null
  windMph: number | null
  windDirection: string | null
  precipitationChance: number | null
  airQuality: number | null
  sunrise: string | null
  sunset: string | null
  notes: string[]
  lakeTempF: number | null
  lakeNote: string | null
}

export interface TodayResponse {
  date: string
  briefing: string | null
  readiness: ReadinessView | null
  sessions: TodaySession[]
  ptProtocols: PtProtocolView[]
  symptomsToday: {
    id: string
    site: string
    painScore: number
    context: string | null
    swelling: boolean
    locking: boolean
    instability: boolean
  }[]
  injuries: { name: string; status: string; sites: string[] }[]
  block: { name: string; phase: string; number: number; goals: string[] } | null
  load: {
    ctl: number | null
    atl: number | null
    tsb: number | null
    acwr: number | null
    weeklyTss: number
  } | null
  conditions: ConditionsView | null
  onboard: {
    intakeComplete: boolean
    missingTests: string[]
  } | null
}

export interface PlanWeekView {
  weekStart: string
  plannedTss: number
  sessions: TodaySession[]
}

export interface SpendSummaryView {
  day: { spent: number; cap: number; pct: number }
  month: { spent: number; cap: number; pct: number }
  projectedMonthEnd: number
  byJob: { job: string; runs: number; costUsd: number; avgCacheHitRatio: number | null }[]
  byModel: { model: string; runs: number; costUsd: number }[]
  state: 'normal' | 'degraded' | 'capped'
}

/** Pain sites the check-in offers, matching the seeded injury record. */
export const SYMPTOM_SITES = [
  { value: 'r_knee_medial', label: 'Right knee (inner)' },
  { value: 'l_knee_medial', label: 'Left knee (inner)' },
  { value: 'r_knee_anterior', label: 'Right knee (front)' },
  { value: 'l_knee_anterior', label: 'Left knee (front)' },
  { value: 'pes_anserine', label: 'Pes anserine' },
  { value: 'hamstring_tendon', label: 'Hamstring tendon' },
  { value: 'bakers_cyst', label: "Baker's cyst (back of knee)" },
  { value: 'calf', label: 'Calf' },
  { value: 'achilles', label: 'Achilles' },
  { value: 'hip', label: 'Hip' },
  { value: 'lower_back', label: 'Lower back' },
  { value: 'shoulder', label: 'Shoulder' },
] as const

export interface CoachConversationListItem {
  id: string
  title: string | null
  message_count: number | null
  last_message_at: string | null
  created_at: string
  deep_mode?: boolean
}

export interface CoachConversationRecord {
  id: string
  title: string | null
  summary: string | null
  message_count: number | null
  deep_mode: boolean
}

export const SPORT_LABELS: Record<string, string> = {
  swim: 'Swim',
  bike: 'Bike',
  run: 'Run',
  strength: 'Strength',
  pt: 'PT',
  brick: 'Brick',
  walk: 'Walk',
  hiit: 'HIIT',
  cross: 'Cross',
  rest: 'Rest',
  other: 'Other',
}
