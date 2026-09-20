/**
 * Analytics pipeline: compute deterministic training metrics and persist them.
 *
 * The model never does arithmetic on raw samples. Everything it reasons over
 * is computed here, stored in coach_activity_load / coach_daily_readiness, and
 * handed to the prompt as finished numbers. That keeps the coach's claims
 * reproducible and auditable, and keeps a million heart rate samples out of
 * the context window.
 */

import type {
  Activity,
  DailyLoad,
  LoadSummary,
  Readiness,
  Sport,
} from '@petehome/coach-core'
import {
  computeAcwr,
  computeDecoupling,
  computeLoad,
  computeMonotony,
  computePmc,
  computeRampRate,
  computeReadiness,
  computeStrain,
  computeZoneSeconds,
  daysAgo,
  estimateCssFromSteadySwim,
  projectRace,
  thresholdSpeedFromVdot,
  weeklyLoad,
  weeklyLoadBySport,
} from '@petehome/coach-core'

import {
  coachDb,
  getActiveInjuries,
  getAthleteProfile,
  getDailyMetrics,
  getHeartRateSamples,
  getHrZoneConfig,
  getMacrocycle,
  getSymptoms,
  queryActivities,
} from './coach-data.service'

/** Bump when a formula changes so stale rows can be found and recomputed. */
const CALC_VERSION = 1

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

export interface AthleteThresholdSet {
  lthr: number | null
  runThresholdSpeed: number | null
  cssSpeed: number | null
  ftpWatts: number | null
  vdot: number | null
}

/**
 * Resolve the threshold values the load formulas need.
 *
 * Prefers explicitly recorded benchmarks, then the athlete profile, then an
 * estimate from recent training. Returning nulls is fine — computeLoad falls
 * back down the measurement ladder and records which method it used.
 */
export async function resolveThresholds(): Promise<AthleteThresholdSet> {
  const profile = await getAthleteProfile()

  let cssSpeed: number | null = null
  if (profile?.cssPacePer100yd && profile.cssPacePer100yd > 0) {
    // Stored as seconds per 100 yards.
    cssSpeed = (100 * 0.9144) / profile.cssPacePer100yd
  }

  if (!cssSpeed) {
    // Estimate from the longest recent continuous swim so swim load is not
    // stuck on the duration-only fallback before the first CSS test.
    const swims = await queryActivities({
      from: daysAgo(60),
      sports: ['swim'],
      limit: 30,
    })
    const best = swims
      .filter((swim) => (swim.distanceMeters ?? 0) >= 400 && swim.durationSeconds > 0)
      .sort((a, b) => (b.distanceMeters ?? 0) - (a.distanceMeters ?? 0))[0]

    if (best?.distanceMeters) {
      const estimate = estimateCssFromSteadySwim(best.distanceMeters, best.durationSeconds)
      cssSpeed = estimate?.speed ?? null
    }
  }

  const vdot = profile?.vdot ?? null

  return {
    lthr: profile?.lthr ?? (profile?.maxHr ? Math.round(profile.maxHr * 0.88) : null),
    runThresholdSpeed: vdot ? thresholdSpeedFromVdot(vdot) : null,
    cssSpeed,
    ftpWatts: profile?.ftpWatts ?? null,
    vdot,
  }
}

// ---------------------------------------------------------------------------
// Per-activity load
// ---------------------------------------------------------------------------

export interface ActivityLoadResult {
  activityId: string
  tss: number
  method: string
  recomputed: boolean
}

/**
 * Compute and store load for one activity.
 * Idempotent: safe to call again after ingestion backfills more samples.
 */
export async function computeActivityLoad(activity: Activity): Promise<ActivityLoadResult> {
  const [zoneConfig, thresholds] = await Promise.all([getHrZoneConfig(), resolveThresholds()])

  const hrSamples = await getHeartRateSamples(activity.id, activity.startDate)

  const load = computeLoad({
    sport: activity.sport,
    durationSeconds: activity.durationSeconds,
    distanceMeters: activity.distanceMeters,
    hrSamples,
    hrAverage: activity.hrAverage,
    zoneConfig,
    thresholds,
  })

  const zoneSeconds = hrSamples.length ? computeZoneSeconds(hrSamples, zoneConfig) : null

  // Decoupling only means something on a steady aerobic effort; on intervals
  // the drift is by design and the number would be misleading.
  const decoupling =
    hrSamples.length && activity.distanceMeters && isSteadyEffort(activity)
      ? computeDecoupling(hrSamples, activity.distanceMeters)
      : null

  const { error } = await coachDb()
    .from('coach_activity_load')
    .upsert(
      {
        activity_id: activity.id,
        activity_date: activity.activityDate,
        sport: activity.sport,
        tss: load.tss,
        tss_method: load.method,
        trimp: load.trimp,
        intensity_factor: load.intensityFactor,
        decoupling_pct: decoupling,
        zone_seconds: zoneSeconds ?? {},
        computed_at: new Date().toISOString(),
        calc_version: CALC_VERSION,
      },
      { onConflict: 'activity_id' }
    )

  if (error) throw new Error(`Failed to store activity load: ${error.message}`)

  return {
    activityId: activity.id,
    tss: load.tss,
    method: load.method,
    recomputed: true,
  }
}

/** Steady efforts are where decoupling is interpretable. */
function isSteadyEffort(activity: Activity): boolean {
  if (activity.durationSeconds < 1800) return false
  if (activity.sport === 'strength' || activity.sport === 'hiit') return false
  return true
}

/** Recompute any activity that has no load row or an outdated calc version. */
export async function recomputeMissingLoads(sinceDays = 120): Promise<number> {
  const activities = await queryActivities({ from: daysAgo(sinceDays), limit: 1000 })

  const { data: existing } = await coachDb()
    .from('coach_activity_load')
    .select('activity_id, calc_version')
    .gte('activity_date', daysAgo(sinceDays))

  const current = new Map<string, number>(
    (existing ?? []).map((row: { activity_id: string; calc_version: number }) => [
      row.activity_id,
      row.calc_version,
    ])
  )

  let count = 0
  for (const activity of activities) {
    const version = current.get(activity.id)
    if (version === CALC_VERSION) continue

    try {
      await computeActivityLoad(activity)
      count++
    } catch (error) {
      console.error(`[coach] Failed to compute load for ${activity.id}:`, error)
    }
  }

  return count
}

// ---------------------------------------------------------------------------
// Aggregate load
// ---------------------------------------------------------------------------

export async function getLoadSummary(days = 120): Promise<LoadSummary> {
  const activities = await queryActivities({ from: daysAgo(days), limit: 1000 })

  const dailyLoads: DailyLoad[] = activities.map((activity) => ({
    date: activity.activityDate,
    tss: activity.tss ?? 0,
  }))

  const pmc = computePmc(dailyLoads)
  const current = pmc[pmc.length - 1] ?? null

  return {
    pmc,
    current,
    acwr: computeAcwr(dailyLoads),
    monotony: computeMonotony(dailyLoads),
    strain: computeStrain(dailyLoads),
    weeklyTss: weeklyLoad(dailyLoads),
    weeklyTssBySport: weeklyLoadBySport(
      activities.map((activity) => ({
        activityDate: activity.activityDate,
        sport: activity.sport as Sport,
        tss: activity.tss,
      }))
    ),
  }
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export async function computeAndStoreReadiness(date?: string): Promise<Readiness> {
  const target = date ?? new Date().toISOString().slice(0, 10)

  const [metrics, symptoms, load] = await Promise.all([
    getDailyMetrics(daysAgo(30, new Date(`${target}T12:00:00Z`)), target),
    getSymptoms(daysAgo(14, new Date(`${target}T12:00:00Z`)), target),
    getLoadSummary(),
  ])

  const readiness = computeReadiness({
    date: target,
    metrics,
    ctl: load.current?.ctl ?? null,
    atl: load.current?.atl ?? null,
    tsb: load.current?.tsb ?? null,
    acwr: load.acwr,
    monotony: load.monotony,
    strain: load.strain,
    symptoms,
  })

  const { error } = await coachDb()
    .from('coach_daily_readiness')
    .upsert(
      {
        metric_date: target,
        hrv_sdnn: readiness.inputs.hrvSdnn,
        hrv_baseline_7d: readiness.inputs.hrvBaseline7d,
        hrv_z_score: readiness.inputs.hrvZScore,
        rhr: readiness.inputs.rhr,
        rhr_baseline_7d: readiness.inputs.rhrBaseline7d,
        sleep_seconds: readiness.inputs.sleepSeconds,
        ctl: readiness.inputs.ctl,
        atl: readiness.inputs.atl,
        tsb: readiness.inputs.tsb,
        acwr: readiness.inputs.acwr,
        monotony: readiness.inputs.monotony,
        strain: readiness.inputs.strain,
        max_pain_7d: readiness.inputs.maxPain7d,
        score: readiness.score,
        level: readiness.level,
        components: readiness.components,
        flags: readiness.flags,
        computed_at: new Date().toISOString(),
        calc_version: CALC_VERSION,
      },
      { onConflict: 'metric_date' }
    )

  if (error) throw new Error(`Failed to store readiness: ${error.message}`)

  return readiness
}

// ---------------------------------------------------------------------------
// Race projection
// ---------------------------------------------------------------------------

export async function getRaceProjection() {
  const [macrocycle, thresholds, profile] = await Promise.all([
    getMacrocycle(),
    resolveThresholds(),
    getAthleteProfile(),
  ])

  if (!macrocycle) return null

  const raceDate = new Date(`${macrocycle.goalRaceDate}T00:00:00Z`)
  const weeksRemaining = Math.max(
    0,
    Math.round((raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
  )

  const budget = macrocycle.splitBudget as Record<string, number>

  // Best sustained bike effort in the last 90 days, as a speed proxy for the
  // 40 km race leg when no power meter is available.
  const rides = await queryActivities({ from: daysAgo(90), sports: ['bike'], limit: 60 })
  const bestRide = rides
    .filter((ride) => ride.durationSeconds >= 1800 && (ride.distanceMeters ?? 0) > 0)
    .map((ride) => (ride.distanceMeters ?? 0) / ride.durationSeconds)
    .sort((a, b) => b - a)[0]

  const massKg =
    profile?.weightTargetHighLbs != null
      ? profile.weightTargetHighLbs * 0.453592 + 9
      : null

  return projectRace({
    raceDate: macrocycle.goalRaceDate,
    goalSeconds: macrocycle.goalTimeSeconds ?? 10800,
    budget: {
      swimSeconds: budget.swim_seconds ?? 1980,
      t1Seconds: budget.t1_seconds ?? 420,
      bikeSeconds: budget.bike_seconds ?? 4680,
      t2Seconds: budget.t2_seconds ?? 150,
      runSeconds: budget.run_seconds ?? 3510,
    },
    cssSpeed: thresholds.cssSpeed,
    vdot: thresholds.vdot,
    bikeThresholdSpeed: bestRide ?? null,
    ftpWatts: thresholds.ftpWatts,
    totalMassKg: massKg,
    weeksRemaining,
  })
}

// ---------------------------------------------------------------------------
// Nightly recompute
// ---------------------------------------------------------------------------

export async function nightlyRecompute(): Promise<{
  loadsComputed: number
  readinessDays: number
}> {
  const loadsComputed = await recomputeMissingLoads()

  // Recompute the trailing week: late-arriving HealthKit samples and symptom
  // logs both change readiness for days that have already passed.
  let readinessDays = 0
  for (let offset = 0; offset < 7; offset++) {
    const date = daysAgo(offset + 1)
    try {
      await computeAndStoreReadiness(date)
      readinessDays++
    } catch (error) {
      console.error(`[coach] Readiness failed for ${date}:`, error)
    }
  }

  return { loadsComputed, readinessDays }
}

export { getActiveInjuries, computeRampRate }
