/**
 * Shapes returned by the /api/coach/* endpoints.
 *
 * Declared separately from the domain types in coach-core because the API
 * flattens and formats for display: durations arrive as minutes, guardrail
 * reports are reduced to what the UI renders.
 */

import type { GuardrailSeverity, ReadinessLevel, Sport } from '@petehome/coach-core'
import type { HeartRateZone } from '@/lib/types/apple-health.types'

/** Linked workout summary for completed session cards (no samples). */
export interface SessionActivityGlance {
  id: string
  workoutType: string
  durationSeconds: number
  distanceMeters: number | null
  tss: number | null
  hrAverage: number | null
  hrZones: HeartRateZone[] | null
  zoneSeconds: { z1: number; z2: number; z3: number; z4: number; z5: number } | null
  paceAverage: number | null
  cadenceAverage: number | null
  cyclingAvgPower: number | null
  cyclingAvgSpeed: number | null
  swimPacePer100: number | null
  swimSwolf: number | null
  swimLapCount: number | null
  activeCalories: number | null
  effortScore: number | null
  elevationGainMeters: number | null
  isIndoor: boolean | null
}

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
  /** Present when status is completed and a HealthKit workout is linked. */
  activity?: SessionActivityGlance | null
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
    id: string
    name: string
    slug: string
    category: string
    prescription: Record<string, unknown>
    cues: string | null
    demoYoutubeId?: string | null
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

/** Last night from apple_health_daily_metrics for the Today rail. */
export interface LastNightSleepView {
  hours: number | null
  inBedHours: number | null
  efficiencyPct: number | null
  deepMinutes: number | null
  remMinutes: number | null
  coreMinutes: number | null
  awakeMinutes: number | null
  start: string | null
  end: string | null
  breathingDisturbancesElevated: boolean | null
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
  lastNightSleep: LastNightSleepView | null
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

/** 48-week periodization skeleton (petehome.md). Later blocks are not all seeded yet. */
export const YEAR_PLAN_PHASES = [
  {
    weekFrom: 1,
    weekTo: 8,
    label: 'Return + rehab',
    intent: 'Swim 3×, high-cadence bike, walk/run 2×, strength 2×, PT daily, CSS + quad tests',
  },
  {
    weekFrom: 9,
    weekTo: 20,
    label: 'Base 1',
    intent: 'Swim to ~3500 yd, indoor bike 3×, run 3× Z2 to 15–18 mi/wk, deload every 4th',
  },
  {
    weekFrom: 21,
    weekTo: 30,
    label: 'Base 2 / early build',
    intent: 'Tempo, threshold, race-pace swim, first bricks, spring 10K C',
  },
  {
    weekFrom: 31,
    weekTo: 40,
    label: 'Build',
    intent: 'Outdoor Lakefront, open water from ~June, weekly bricks, sprint B',
  },
  {
    weekFrom: 41,
    weekTo: 46,
    label: 'Peak',
    intent: 'Course + fuel + heat, July B',
  },
  {
    weekFrom: 47,
    weekTo: 48,
    label: 'Taper',
    intent: 'Race week',
  },
] as const

export interface YearPlanPhaseView {
  weekFrom: number
  weekTo: number
  label: string
  intent: string
  current: boolean
}

export interface YearPlanView {
  name: string
  goalRaceName: string | null
  goalRaceDate: string
  goalTimeSeconds: number | null
  startDate: string
  daysToRace: number
  currentWeek: number | null
  currentBlock: {
    name: string
    phase: string
    number: number
    goals: string[]
  } | null
  phases: YearPlanPhaseView[]
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

export interface GearServiceView {
  id: string
  serviceType: string
  performedOn: string | null
  dueOn: string | null
  intervalMiles: number | null
  notes: string | null
}

export interface GearItemView {
  id: string
  name: string
  category: string
  sport: string | null
  brand: string | null
  model: string | null
  purchasedOn: string | null
  retiredOn: string | null
  costUsd: number | null
  notes: string | null
  totalMeters: number
  totalMiles: number
  lifeLimitMeters: number | null
  lifeLimitMiles: number | null
  lifeRemainingPct: number | null
  sessionCount: number
  status: 'ok' | 'approaching_limit' | 'past_limit' | 'service_due'
  serviceDue: { type: string; dueOn: string | null; note: string }[]
  services: GearServiceView[]
}

export interface GearOverlapView {
  sport: string
  itemA: { id: string; name: string }
  itemB: { id: string; name: string }
  overlapFrom: string
  overlapTo: string
}

export interface GearRecommendationView {
  id: string
  title: string
  category: string
  rationale: string
  estimatedCostUsd: number | null
  estimatedSecondsSaved: number | null
  costPerSecond: number | null
  status: string
}

export interface GearInventoryView {
  items: GearItemView[]
  recommendations: GearRecommendationView[]
  alerts: { name: string; message: string; severity: 'info' | 'warn' }[]
  overlaps: GearOverlapView[]
}

export const GEAR_CATEGORY_LABELS: Record<string, string> = {
  shoes: 'Shoes',
  bike: 'Bike',
  component: 'Component',
  wetsuit: 'Wetsuit',
  sensor: 'Sensor',
  apparel: 'Apparel',
  other: 'Other',
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
