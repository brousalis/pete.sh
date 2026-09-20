/**
 * Shared domain types for PeteCoach.
 *
 * These mirror the coach_* schema and the coach_activity_v / coach_daily_metric_v
 * views. Analytics, guardrails, prompts and tools all speak these types so the
 * web app and the worker can never drift.
 */

export type Sport = 'swim' | 'bike' | 'run' | 'strength' | 'pt' | 'brick' | 'walk' | 'hiit' | 'cross' | 'other' | 'rest'

/** Sports that load the knee through impact. Drives several guardrail rules. */
export const IMPACT_SPORTS: readonly Sport[] = ['run', 'brick', 'hiit'] as const

export const TRIATHLON_SPORTS: readonly Sport[] = ['swim', 'bike', 'run'] as const

export type SessionType =
  | 'recovery'
  | 'z2'
  | 'endurance'
  | 'long'
  | 'tempo'
  | 'threshold'
  | 'intervals'
  | 'vo2'
  | 'sprint'
  | 'technique'
  | 'test'
  | 'strength'
  | 'rehab'
  | 'brick'
  | 'rest'
  | 'walk_run'

/** Session types that count as hard days for spacing rules. */
export const HIGH_INTENSITY_TYPES: readonly SessionType[] = [
  'tempo',
  'threshold',
  'intervals',
  'vo2',
  'sprint',
  'test',
] as const

export type Phase = 'rehab' | 'base1' | 'base2' | 'build' | 'peak' | 'taper' | 'race'

export type ReadinessLevel = 'fresh' | 'moderate' | 'fatigued' | 'compromised'

export type TssMethod = 'hrTSS' | 'rTSS' | 'sTSS' | 'pTSS' | 'estimated'

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export interface HeartRateSample {
  /** Seconds from activity start */
  t: number
  bpm: number
}

export interface PaceSample {
  t: number
  /** Metres per second */
  speed: number
}

export interface Activity {
  id: string
  healthkitId: string
  activityDate: string // YYYY-MM-DD in athlete-local time
  startDate: string // ISO
  endDate: string // ISO
  durationSeconds: number
  sport: Sport
  rawType: string
  isIndoor: boolean | null

  distanceMeters: number | null
  elevationGainMeters: number | null
  activeCalories: number | null

  hrAverage: number | null
  hrMin: number | null
  hrMax: number | null

  cadenceAverage: number | null
  /** Minutes per mile, as stored by the ingest layer */
  paceAverage: number | null
  runningPowerAvg: number | null

  swimStrokeCount: number | null
  swimPoolLengthMeters: number | null
  swimLocation: string | null

  effortScore: number | null
  source: string | null
  deviceName: string | null

  // Computed (coach_activity_load)
  tss: number | null
  tssMethod: TssMethod | null
  trimp: number | null
  intensityFactor: number | null
  decouplingPct: number | null
  zoneSeconds: ZoneSeconds | null

  plannedSessionId: string | null
}

export interface ZoneSeconds {
  z1: number
  z2: number
  z3: number
  z4: number
  z5: number
}

export function emptyZoneSeconds(): ZoneSeconds {
  return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
}

// ---------------------------------------------------------------------------
// Daily metrics and readiness
// ---------------------------------------------------------------------------

export interface DailyMetric {
  metricDate: string
  steps: number | null
  exerciseMinutes: number | null
  restingHeartRate: number | null
  /** Apple reports SDNN, not RMSSD. Baselines matter more than absolutes. */
  hrvSdnn: number | null
  vo2Max: number | null
  sleepSeconds: number | null
  sleepDeep: number | null
  sleepRem: number | null
  sleepCore: number | null
  sleepAwake: number | null
  respiratoryRate: number | null
  wristTempDelta: number | null
  spo2: number | null
  bodyMassLbs: number | null
  bodyFatPercentage: number | null
  leanBodyMassLbs: number | null
}

export interface ReadinessComponent {
  key: string
  label: string
  score: number
  weight: number
  detail: string
}

export interface Readiness {
  metricDate: string
  score: number
  level: ReadinessLevel
  components: ReadinessComponent[]
  flags: string[]
  inputs: {
    hrvSdnn: number | null
    hrvBaseline7d: number | null
    hrvZScore: number | null
    rhr: number | null
    rhrBaseline7d: number | null
    sleepSeconds: number | null
    ctl: number | null
    atl: number | null
    tsb: number | null
    acwr: number | null
    monotony: number | null
    strain: number | null
    maxPain7d: number | null
  }
}

// ---------------------------------------------------------------------------
// Training load
// ---------------------------------------------------------------------------

export interface DailyLoad {
  date: string
  tss: number
}

export interface PmcPoint {
  date: string
  tss: number
  ctl: number
  atl: number
  tsb: number
}

export interface LoadSummary {
  pmc: PmcPoint[]
  current: PmcPoint | null
  acwr: number | null
  monotony: number | null
  strain: number | null
  weeklyTss: number
  weeklyTssBySport: Partial<Record<Sport, number>>
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export interface HrZoneConfig {
  maxHr: number
  restingHr: number
  /** Lower bound BPM for each zone, ascending. */
  z1: number
  z2: number
  z3: number
  z4: number
  z5: number
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export type StepGoalType = 'time' | 'distance' | 'open' | 'repetitions'
export type StepAlertType = 'heartRate' | 'pace' | 'power' | 'cadence' | 'none'

export interface StepGoal {
  type: StepGoalType
  value?: number
  /** 'seconds' | 'meters' | 'yards' | 'reps' */
  unit?: string
}

export interface StepAlert {
  type: StepAlertType
  /** BPM, m/s, watts or rpm depending on type */
  min?: number
  max?: number
  zone?: number
}

export interface WorkoutStep {
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown'
  label?: string
  goal: StepGoal
  alert?: StepAlert
  note?: string
}

export interface WorkoutBlock {
  repeat: number
  steps: WorkoutStep[]
}

/** WorkoutKit-compatible structure; maps 1:1 onto CustomWorkout. */
export interface StructuredWorkout {
  warmup?: WorkoutStep
  blocks: WorkoutBlock[]
  cooldown?: WorkoutStep
}

export interface PlannedSession {
  id: string
  weekId: string
  sessionDate: string
  slot: 'primary' | 'second' | 'pt_morning' | 'pt_evening'
  sortOrder: number
  sport: Sport
  sessionType: SessionType
  title: string
  description: string | null
  plannedDurationSeconds: number | null
  plannedDistanceMeters: number | null
  plannedLoad: number | null
  steps: StructuredWorkout | Record<string, never>
  targets: SessionTargets
  rationale: string | null
  guardrailReport: GuardrailReport | null
  status: 'planned' | 'completed' | 'skipped' | 'modified' | 'cancelled'
  completedActivityId: string | null
  watchSyncState: 'pending' | 'scheduled' | 'unsupported' | 'failed'
}

export interface SessionTargets {
  hrZone?: number
  hrRange?: [number, number]
  /** Seconds per mile for run, seconds per 100yd for swim */
  paceRange?: [number, number]
  cadenceRange?: [number, number]
  rpe?: number
  powerRange?: [number, number]
}

export interface PlanWeek {
  id: string
  blockId: string
  weekStart: string
  weekNumber: number
  isDeload: boolean
  focus: string | null
  status: 'draft' | 'approved' | 'active' | 'complete'
  plannedLoad: Record<string, number>
  actualLoad: Record<string, number>
  rationale: string | null
  sessions: PlannedSession[]
}

export interface PlanBlock {
  id: string
  blockNumber: number
  name: string
  phase: Phase
  startDate: string
  endDate: string
  goals: string[]
  plannedTests: string[]
}

// ---------------------------------------------------------------------------
// Injury
// ---------------------------------------------------------------------------

export interface InjuryStatus {
  id: string
  name: string
  bodyRegion: string
  sites: string[]
  status: 'active' | 'managed' | 'resolved'
  severity: string | null
  contraindications: string[]
  clearances: Record<string, unknown>
  diagnosis: Record<string, unknown>
}

export interface SymptomLog {
  id: string
  logDate: string
  site: string
  painScore: number
  context: string | null
  swelling: boolean
  instability: boolean
  locking: boolean
  notes: string | null
}

export type GuardrailSeverity = 'ok' | 'info' | 'warn' | 'block' | 'red_flag'

export interface GuardrailViolation {
  ruleId: string
  severity: GuardrailSeverity
  message: string
  /** What the engine did or suggests doing about it. */
  remedy?: string
  data?: Record<string, unknown>
}

export interface GuardrailReport {
  /** False when any violation has severity 'block' or 'red_flag'. */
  passed: boolean
  severity: GuardrailSeverity
  violations: GuardrailViolation[]
  evaluatedAt: string
  rulesetVersion: string
}

// ---------------------------------------------------------------------------
// Benchmarks and projection
// ---------------------------------------------------------------------------

export interface SplitBudget {
  swimSeconds: number
  t1Seconds: number
  bikeSeconds: number
  t2Seconds: number
  runSeconds: number
}

export interface RaceProjection {
  raceDate: string
  goalSeconds: number
  projectedSeconds: number
  confidenceLow: number
  confidenceHigh: number
  splits: {
    discipline: 'swim' | 't1' | 'bike' | 't2' | 'run'
    budgetSeconds: number
    projectedSeconds: number
    deltaSeconds: number
    basis: string
  }[]
  limiters: string[]
}
