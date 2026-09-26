/**
 * Coach data access.
 *
 * The single place that reads coach_* tables and the normalised views, and the
 * only place that knows the snake_case column names. Everything above this
 * layer works in the camelCase domain types from @petehome/coach-core, so the
 * web app and the worker cannot drift in how they interpret a row.
 */

import type {
  Activity,
  DailyMetric,
  HeartRateSample,
  HrZoneConfig,
  InjuryStatus,
  PlanWeek,
  PlannedSession,
  Sport,
  SymptomLog,
  TssMethod,
} from '@petehome/coach-core'
import { defaultZoneConfig } from '@petehome/coach-core'

import { getSupabaseMedicalClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

function db(): Db {
  const client = getSupabaseMedicalClient()
  if (!client) {
    throw new Error(
      'Coach data requires SUPABASE_SERVICE_ROLE_KEY. coach_* and apple_health_* tables deny anon access.'
    )
  }
  return client
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// ---------------------------------------------------------------------------
// Athlete
// ---------------------------------------------------------------------------

export interface AthleteProfile {
  id: string
  name: string
  birthDate: string | null
  heightCm: number | null
  weightTargetLowLbs: number | null
  weightTargetHighLbs: number | null
  bodyFatTargetPct: number | null
  maxHr: number | null
  restingHrBaseline: number | null
  lthr: number | null
  cssPacePer100yd: number | null
  ftpWatts: number | null
  vdot: number | null
  goalRaceName: string | null
  goalRaceDate: string | null
  goalTimeSeconds: number | null
  timezone: string
  notes: string | null
}

export async function getAthleteProfile(): Promise<AthleteProfile | null> {
  const { data, error } = await db()
    .from('coach_athlete_profile')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to load athlete profile: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    birthDate: data.birth_date,
    heightCm: toNumber(data.height_cm),
    weightTargetLowLbs: toNumber(data.weight_target_low_lbs),
    weightTargetHighLbs: toNumber(data.weight_target_high_lbs),
    bodyFatTargetPct: toNumber(data.body_fat_target_pct),
    maxHr: toNumber(data.max_hr),
    restingHrBaseline: toNumber(data.resting_hr_baseline),
    lthr: toNumber(data.lthr),
    cssPacePer100yd: toNumber(data.css_pace_per_100yd),
    ftpWatts: toNumber(data.ftp_watts),
    vdot: toNumber(data.vdot),
    goalRaceName: data.goal_race_name,
    goalRaceDate: data.goal_race_date,
    goalTimeSeconds: toNumber(data.goal_time_seconds),
    timezone: data.timezone ?? 'America/Chicago',
    notes: data.notes,
  }
}

/**
 * Heart rate zones, preferring the athlete's configured thresholds.
 *
 * The legacy zone calculation ignored this table and assumed max HR 185 with
 * fixed percentage bands, which disagreed with the zones shown elsewhere in
 * the dashboard.
 */
export async function getHrZoneConfig(): Promise<HrZoneConfig> {
  // effective_to IS NULL marks the currently active configuration.
  const { data } = await db()
    .from('user_hr_zones_config')
    .select('*')
    .is('effective_to', null)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  const profile = await getAthleteProfile().catch(() => null)

  const maxHr = toNumber(data?.max_hr) ?? profile?.maxHr ?? 185
  const restingHr = toNumber(data?.resting_hr) ?? profile?.restingHrBaseline ?? 52

  // The table stores each zone's lower bound (zone 1 only has an upper bound,
  // so its floor is resting HR).
  const z2 = toNumber(data?.zone2_min_bpm)
  const z3 = toNumber(data?.zone3_min_bpm)
  const z4 = toNumber(data?.zone4_min_bpm)
  const z5 = toNumber(data?.zone5_min_bpm)

  if (z2 && z3 && z4 && z5) {
    return { maxHr, restingHr, z1: restingHr, z2, z3, z4, z5 }
  }

  return defaultZoneConfig(maxHr, restingHr)
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    healthkitId: row.healthkit_id as string,
    activityDate: row.activity_date as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    durationSeconds: (toNumber(row.duration_seconds) ?? 0) as number,
    sport: (row.sport as Sport) ?? 'other',
    rawType: (row.raw_type as string) ?? 'other',
    isIndoor: (row.is_indoor as boolean | null) ?? null,
    distanceMeters: toNumber(row.distance_meters),
    elevationGainMeters: toNumber(row.elevation_gain_meters),
    activeCalories: toNumber(row.active_calories),
    hrAverage: toNumber(row.hr_average),
    hrMin: toNumber(row.hr_min),
    hrMax: toNumber(row.hr_max),
    cadenceAverage: toNumber(row.cadence_average),
    paceAverage: toNumber(row.pace_average),
    runningPowerAvg: toNumber(row.running_power_avg),
    swimStrokeCount: toNumber(row.swimming_stroke_count),
    swimPoolLengthMeters: toNumber(row.swimming_pool_length_meters),
    swimLocation: (row.swimming_location as string | null) ?? null,
    effortScore: toNumber(row.effort_score),
    source: (row.source as string | null) ?? null,
    deviceName: (row.device_name as string | null) ?? null,
    tss: toNumber(row.tss),
    tssMethod: (row.tss_method as TssMethod | null) ?? null,
    trimp: toNumber(row.trimp),
    intensityFactor: toNumber(row.intensity_factor),
    decouplingPct: toNumber(row.decoupling_pct),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zoneSeconds: (row.zone_seconds as any) ?? null,
    plannedSessionId: (row.planned_session_id as string | null) ?? null,
  }
}

export interface ActivityQuery {
  from?: string
  to?: string
  sports?: Sport[]
  limit?: number
}

export async function queryActivities(query: ActivityQuery = {}): Promise<Activity[]> {
  let builder = db().from('coach_activity_v').select('*').order('start_date', { ascending: false })

  if (query.from) builder = builder.gte('activity_date', query.from)
  if (query.to) builder = builder.lte('activity_date', query.to)
  if (query.sports?.length) builder = builder.in('sport', query.sports)
  builder = builder.limit(query.limit ?? 200)

  const { data, error } = await builder
  if (error) throw new Error(`Failed to query activities: ${error.message}`)

  return (data ?? []).map(mapActivity)
}

export async function getActivity(id: string): Promise<Activity | null> {
  const { data, error } = await db().from('coach_activity_v').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load activity: ${error.message}`)
  return data ? mapActivity(data) : null
}

export async function getActivitiesByIds(ids: string[]): Promise<Activity[]> {
  if (ids.length === 0) return []
  const { data, error } = await db().from('coach_activity_v').select('*').in('id', ids)
  if (error) throw new Error(`Failed to load activities: ${error.message}`)
  return (data ?? []).map((row: Record<string, unknown>) => mapActivity(row))
}

/**
 * Heart rate series for an activity, as seconds-from-start offsets.
 *
 * Downsampled above `maxSamples` by taking every Nth point. A three-hour ride
 * can hold 10k+ samples and the analytics do not get more accurate past a few
 * thousand, while the memory cost of loading every ride at full resolution
 * during a nightly recompute is real.
 */
export async function getHeartRateSamples(
  activityId: string,
  startDate: string,
  maxSamples = 3000
): Promise<HeartRateSample[]> {
  const { data, error } = await db()
    .from('apple_health_hr_samples')
    .select('timestamp, bpm')
    .eq('workout_id', activityId)
    .order('timestamp', { ascending: true })

  if (error) throw new Error(`Failed to load heart rate samples: ${error.message}`)
  if (!data?.length) return []

  const start = new Date(startDate).getTime()
  const stride = Math.max(1, Math.ceil(data.length / maxSamples))

  const samples: HeartRateSample[] = []
  for (let i = 0; i < data.length; i += stride) {
    const row = data[i] as { timestamp: string; bpm: number }
    samples.push({
      t: Math.round((new Date(row.timestamp).getTime() - start) / 1000),
      bpm: row.bpm,
    })
  }

  return samples
}

// ---------------------------------------------------------------------------
// Daily metrics
// ---------------------------------------------------------------------------

export async function getDailyMetrics(from: string, to: string): Promise<DailyMetric[]> {
  const { data, error } = await db()
    .from('coach_daily_metric_v')
    .select('*')
    .gte('metric_date', from)
    .lte('metric_date', to)
    .order('metric_date', { ascending: true })

  if (error) throw new Error(`Failed to load daily metrics: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    metricDate: row.metric_date as string,
    steps: toNumber(row.steps),
    exerciseMinutes: toNumber(row.exercise_minutes),
    restingHeartRate: toNumber(row.resting_heart_rate),
    hrvSdnn: toNumber(row.hrv_sdnn),
    hrvRmssd: toNumber(row.hrv_rmssd),
    hrvOvernightAvg: toNumber(row.hrv_overnight_avg),
    hrvMorning: toNumber(row.hrv_morning),
    vo2Max: toNumber(row.vo2_max),
    sleepSeconds: toNumber(row.sleep_seconds),
    sleepInBed: toNumber(row.sleep_in_bed),
    sleepDeep: toNumber(row.sleep_deep),
    sleepRem: toNumber(row.sleep_rem),
    sleepCore: toNumber(row.sleep_core),
    sleepAwake: toNumber(row.sleep_awake),
    sleepUnspecified: toNumber(row.sleep_unspecified),
    sleepStart: (row.sleep_start as string | null) ?? null,
    sleepEnd: (row.sleep_end as string | null) ?? null,
    respiratoryRate: toNumber(row.respiratory_rate),
    wristTempDelta: toNumber(row.wrist_temp_delta),
    spo2: toNumber(row.spo2),
    breathingDisturbances: toNumber(row.breathing_disturbances),
    breathingDisturbancesElevated:
      typeof row.breathing_disturbances_elevated === 'boolean'
        ? row.breathing_disturbances_elevated
        : null,
    sleepApneaEventCount: toNumber(row.sleep_apnea_event_count),
    bodyMassLbs: toNumber(row.body_mass_lbs),
    bodyFatPercentage: toNumber(row.body_fat_percentage),
    leanBodyMassLbs: toNumber(row.lean_body_mass_lbs),
  }))
}

// ---------------------------------------------------------------------------
// Injury and symptoms
// ---------------------------------------------------------------------------

export async function getActiveInjuries(): Promise<InjuryStatus[]> {
  const { data, error } = await db()
    .from('coach_injury')
    .select('*')
    .neq('status', 'resolved')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load injuries: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    bodyRegion: row.body_region as string,
    sites: (row.sites as string[]) ?? [],
    status: row.status as InjuryStatus['status'],
    severity: (row.severity as string | null) ?? null,
    contraindications: (row.contraindications as string[]) ?? [],
    clearances: (row.clearances as Record<string, unknown>) ?? {},
    diagnosis: (row.diagnosis as Record<string, unknown>) ?? {},
  }))
}

export async function getSymptoms(from: string, to?: string): Promise<SymptomLog[]> {
  let builder = db()
    .from('coach_symptom_log')
    .select('*')
    .gte('log_date', from)
    .order('log_date', { ascending: false })

  if (to) builder = builder.lte('log_date', to)

  const { data, error } = await builder
  if (error) throw new Error(`Failed to load symptoms: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    logDate: row.log_date as string,
    site: row.site as string,
    painScore: (toNumber(row.pain_score) ?? 0) as number,
    context: (row.context as string | null) ?? null,
    swelling: Boolean(row.swelling),
    instability: Boolean(row.instability),
    locking: Boolean(row.locking),
    notes: (row.notes as string | null) ?? null,
  }))
}

export async function logSymptom(input: {
  site: string
  painScore: number
  context?: string
  swelling?: boolean
  instability?: boolean
  locking?: boolean
  notes?: string
  activityId?: string
  sessionId?: string
  logDate?: string
}): Promise<string> {
  const { data, error } = await db()
    .from('coach_symptom_log')
    .insert({
      log_date: input.logDate ?? new Date().toISOString().slice(0, 10),
      site: input.site,
      pain_score: input.painScore,
      context: input.context ?? null,
      swelling: input.swelling ?? false,
      instability: input.instability ?? false,
      locking: input.locking ?? false,
      notes: input.notes ?? null,
      activity_id: input.activityId ?? null,
      session_id: input.sessionId ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to log symptom: ${error.message}`)
  return data.id as string
}

// ---------------------------------------------------------------------------
// PT protocols
// ---------------------------------------------------------------------------

export interface PtProtocol {
  id: string
  slug: string
  name: string
  timeOfDay: string
  cadence: string
  durationMinutes: number | null
  isMandatory: boolean
  description: string | null
  items: {
    id: string
    name: string
    slug: string
    category: string
    prescription: Record<string, unknown>
    cues: string | null
    demoYoutubeId: string | null
    demoStartSeconds: number
    demoLoopSeconds: number
  }[]
}

export async function getPtProtocols(): Promise<PtProtocol[]> {
  const { data, error } = await db()
    .from('coach_pt_protocol')
    .select(
      `id, slug, name, time_of_day, cadence, duration_minutes, is_mandatory, description,
       coach_pt_protocol_item ( sort_order, prescription_override,
         coach_pt_exercise ( id, slug, name, category, prescription, cues,
           demo_youtube_id, demo_start_seconds, demo_loop_seconds ) )`
    )
    .eq('is_active', true)

  if (error) throw new Error(`Failed to load PT protocols: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems = (row.coach_pt_protocol_item as any[]) ?? []

    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      timeOfDay: row.time_of_day as string,
      cadence: row.cadence as string,
      durationMinutes: toNumber(row.duration_minutes),
      isMandatory: Boolean(row.is_mandatory),
      description: (row.description as string | null) ?? null,
      items: rawItems
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item) => ({
          id: item.coach_pt_exercise?.id ?? '',
          slug: item.coach_pt_exercise?.slug ?? '',
          name: item.coach_pt_exercise?.name ?? '',
          category: item.coach_pt_exercise?.category ?? '',
          prescription: item.prescription_override ?? item.coach_pt_exercise?.prescription ?? {},
          cues: item.coach_pt_exercise?.cues ?? null,
          demoYoutubeId: item.coach_pt_exercise?.demo_youtube_id ?? null,
          demoStartSeconds: toNumber(item.coach_pt_exercise?.demo_start_seconds) ?? 0,
          demoLoopSeconds: toNumber(item.coach_pt_exercise?.demo_loop_seconds) ?? 30,
        })),
    }
  })
}

export async function getPtProtocolBySlug(slug: string): Promise<PtProtocol | null> {
  const protocols = await getPtProtocols()
  return protocols.find((protocol) => protocol.slug === slug) ?? null
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function mapSession(row: Record<string, unknown>): PlannedSession {
  return {
    id: row.id as string,
    weekId: row.week_id as string,
    sessionDate: row.session_date as string,
    slot: (row.slot as PlannedSession['slot']) ?? 'primary',
    sortOrder: (toNumber(row.sort_order) ?? 0) as number,
    sport: (row.sport as Sport) ?? 'other',
    sessionType: row.session_type as PlannedSession['sessionType'],
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    plannedDurationSeconds: toNumber(row.planned_duration_seconds),
    plannedDistanceMeters: toNumber(row.planned_distance_meters),
    plannedLoad: toNumber(row.planned_load),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps: (row.steps as any) ?? {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targets: (row.targets as any) ?? {},
    rationale: (row.rationale as string | null) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guardrailReport: (row.guardrail_report as any) ?? null,
    status: (row.status as PlannedSession['status']) ?? 'planned',
    completedActivityId: (row.completed_activity_id as string | null) ?? null,
    watchSyncState: (row.watch_sync_state as PlannedSession['watchSyncState']) ?? 'pending',
  }
}

export async function getSessionsForDate(date: string): Promise<PlannedSession[]> {
  const { data, error } = await db()
    .from('coach_planned_session')
    .select('*')
    .eq('session_date', date)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load sessions: ${error.message}`)
  return (data ?? []).map(mapSession)
}

export async function getSessionsInRange(from: string, to: string): Promise<PlannedSession[]> {
  const { data, error } = await db()
    .from('coach_planned_session')
    .select('*')
    .gte('session_date', from)
    .lte('session_date', to)
    .order('session_date', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load sessions: ${error.message}`)
  return (data ?? []).map(mapSession)
}

export type AthleteSessionStatus = 'completed' | 'skipped' | 'planned'

/**
 * Athlete-facing status flip (mark done / skip / undo). Idempotent: repeating
 * the same status is a no-op success. Does not go through applyProposal — this
 * is recording what happened, not rewriting the prescription.
 *
 * `planned` clears a completed/skipped mark (and any linked activity +
 * session-scoped feedback) so the session can be marked again.
 */
export async function setSessionAthleteStatus(
  sessionId: string,
  status: AthleteSessionStatus
): Promise<PlannedSession> {
  const existing = await db()
    .from('coach_planned_session')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (existing.error) {
    throw new Error(`Failed to load session: ${existing.error.message}`)
  }
  if (!existing.data) {
    throw new Error('Session not found.')
  }

  const current = mapSession(existing.data)
  if (current.status === status) return current

  if (status === 'planned') {
    if (current.status !== 'completed' && current.status !== 'skipped') {
      throw new Error(
        `Session is ${current.status}; only completed or skipped sessions can be unmarked.`
      )
    }

    const { data, error } = await db()
      .from('coach_planned_session')
      .update({ status: 'planned', completed_activity_id: null })
      .eq('id', sessionId)
      .select('*')
      .single()

    if (error) throw new Error(`Failed to update session status: ${error.message}`)

    // Drop mark-done / skip feedback tied to this session so a later mark-done
    // doesn't leave stale RPE/pain attached.
    const feedback = await db()
      .from('coach_session_feedback')
      .delete()
      .eq('session_id', sessionId)
    if (feedback.error) {
      console.error(
        '[coach] Failed to clear session feedback on undo:',
        feedback.error.message
      )
    }

    return mapSession(data)
  }

  if (current.status !== 'planned' && current.status !== 'modified') {
    throw new Error(
      `Session is already ${current.status}; only planned sessions can be marked ${status}.`
    )
  }

  const { data, error } = await db()
    .from('coach_planned_session')
    .update({ status })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update session status: ${error.message}`)
  return mapSession(data)
}

export async function getWeek(weekStart: string): Promise<PlanWeek | null> {
  const { data, error } = await db()
    .from('coach_week')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) throw new Error(`Failed to load week: ${error.message}`)
  if (!data) return null

  const { data: sessions } = await db()
    .from('coach_planned_session')
    .select('*')
    .eq('week_id', data.id)
    .order('session_date', { ascending: true })
    .order('sort_order', { ascending: true })

  return {
    id: data.id,
    blockId: data.block_id,
    weekStart: data.week_start,
    weekNumber: data.week_number,
    isDeload: Boolean(data.is_deload),
    focus: data.focus,
    status: data.status,
    plannedLoad: data.planned_load ?? {},
    actualLoad: data.actual_load ?? {},
    rationale: data.rationale,
    sessions: (sessions ?? []).map(mapSession),
  }
}

export async function getCurrentBlock(): Promise<{
  id: string
  name: string
  phase: string
  blockNumber: number
  startDate: string
  endDate: string
  goals: string[]
} | null> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await db()
    .from('coach_block')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  if (error) throw new Error(`Failed to load block: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    phase: data.phase,
    blockNumber: data.block_number,
    startDate: data.start_date,
    endDate: data.end_date,
    goals: data.goals ?? [],
  }
}

export async function getMacrocycle(): Promise<{
  id: string
  name: string
  goalRaceName: string | null
  goalRaceDate: string
  goalTimeSeconds: number | null
  startDate: string
  splitBudget: Record<string, number>
  notes: string | null
} | null> {
  const { data, error } = await db()
    .from('coach_macrocycle')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to load macrocycle: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    goalRaceName: data.goal_race_name ?? null,
    goalRaceDate: data.goal_race_date,
    goalTimeSeconds: toNumber(data.goal_time_seconds),
    startDate: data.start_date,
    splitBudget: data.split_budget ?? {},
    notes: data.notes ?? null,
  }
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

export async function getBenchmarks(testType?: string): Promise<
  {
    id: string
    testDate: string
    testType: string
    sport: string | null
    result: Record<string, unknown>
    passed: boolean | null
    notes: string | null
  }[]
> {
  let builder = db()
    .from('coach_benchmark_test')
    .select('*')
    .order('test_date', { ascending: false })
    .limit(50)

  if (testType) builder = builder.eq('test_type', testType)

  const { data, error } = await builder
  if (error) throw new Error(`Failed to load benchmarks: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    testDate: row.test_date as string,
    testType: row.test_type as string,
    sport: (row.sport as string | null) ?? null,
    result: (row.result as Record<string, unknown>) ?? {},
    passed: (row.passed as boolean | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  }))
}

export interface BenchmarkInput {
  testDate: string
  testType: string
  sport?: string | null
  result: Record<string, unknown>
  passed?: boolean | null
  notes?: string | null
  activityId?: string | null
}

export async function saveBenchmark(input: BenchmarkInput): Promise<string> {
  const { data, error } = await db()
    .from('coach_benchmark_test')
    .insert({
      test_date: input.testDate,
      test_type: input.testType,
      sport: input.sport ?? null,
      result: input.result,
      passed: input.passed ?? null,
      notes: input.notes ?? null,
      activity_id: input.activityId ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save benchmark: ${error.message}`)

  // Threshold-setting tests write through to the athlete profile so load
  // calculations and the race projection pick them up without a second step.
  const patch: Record<string, unknown> = {}
  if (input.testType === 'css') {
    const pace = toNumber(input.result.pacePer100yd)
    if (pace) patch.css_pace_per_100yd = pace
  }
  if (input.testType === 'run_tt') {
    const vdot = toNumber(input.result.vdot)
    if (vdot) patch.vdot = vdot
  }
  if (input.testType === 'ftp_20min' || input.testType === 'bike_z2') {
    const ftp = toNumber(input.result.ftpWatts)
    if (ftp) patch.ftp_watts = ftp
  }

  if (Object.keys(patch).length > 0) {
    await db().from('coach_athlete_profile').update(patch).eq('is_active', true)
  }

  return data.id as string
}

export async function updateAthleteProfile(patch: {
  notes?: string
  cssPacePer100yd?: number | null
  vdot?: number | null
  ftpWatts?: number | null
  lthr?: number | null
}): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.cssPacePer100yd !== undefined) row.css_pace_per_100yd = patch.cssPacePer100yd
  if (patch.vdot !== undefined) row.vdot = patch.vdot
  if (patch.ftpWatts !== undefined) row.ftp_watts = patch.ftpWatts
  if (patch.lthr !== undefined) row.lthr = patch.lthr

  if (Object.keys(row).length === 0) return

  const { error } = await db().from('coach_athlete_profile').update(row).eq('is_active', true)
  if (error) throw new Error(`Failed to update athlete profile: ${error.message}`)
}

export interface ConstraintRow {
  id: string
  kind: string
  label: string
  detail: Record<string, unknown>
  isActive: boolean
}

export async function getConstraints(): Promise<ConstraintRow[]> {
  const { data, error } = await db()
    .from('coach_constraint')
    .select('id, kind, label, detail, is_active')
    .eq('is_active', true)
    .order('kind')

  if (error) throw new Error(`Failed to load constraints: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    kind: row.kind as string,
    label: row.label as string,
    detail: (row.detail as Record<string, unknown>) ?? {},
    isActive: Boolean(row.is_active),
  }))
}

export async function upsertConstraint(input: {
  kind: string
  label: string
  detail: Record<string, unknown>
}): Promise<void> {
  const existing = await db()
    .from('coach_constraint')
    .select('id')
    .eq('kind', input.kind)
    .eq('label', input.label)
    .maybeSingle()

  if (existing.data?.id) {
    const { error } = await db()
      .from('coach_constraint')
      .update({ detail: input.detail, is_active: true })
      .eq('id', existing.data.id)
    if (error) throw new Error(`Failed to update constraint: ${error.message}`)
    return
  }

  const { error } = await db().from('coach_constraint').insert({
    kind: input.kind,
    label: input.label,
    detail: input.detail,
    is_active: true,
  })
  if (error) throw new Error(`Failed to create constraint: ${error.message}`)
}

export async function isIntakeComplete(): Promise<boolean> {
  const { data } = await db()
    .from('coach_constraint')
    .select('id')
    .eq('kind', 'preference')
    .eq('label', 'intake_complete')
    .eq('is_active', true)
    .maybeSingle()

  return Boolean(data?.id)
}

export { db as coachDb }
