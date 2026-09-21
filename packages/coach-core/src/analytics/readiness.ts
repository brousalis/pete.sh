/**
 * Readiness v2.
 *
 * The previous score mixed physiology with schedule adherence: 15% of it was
 * "did you complete your planned workouts", which measures compliance, not
 * recovery, and penalised exactly the rest days that restore readiness. It
 * also treated a single daily HRV reading as a signal despite Apple sampling
 * SDNN sporadically.
 *
 * This version uses only recovery physiology and accumulated load, scores each
 * input against the athlete's own rolling baseline rather than population
 * norms, and adds symptom history so an aggravated knee suppresses readiness
 * directly instead of waiting to show up in HRV.
 */

import type {
  DailyMetric,
  Readiness,
  ReadinessComponent,
  ReadinessLevel,
  SymptomLog,
} from '../types'
import { clamp } from './zones'

export interface ReadinessInputs {
  date: string
  metrics: DailyMetric[]
  ctl?: number | null
  atl?: number | null
  tsb?: number | null
  acwr?: number | null
  monotony?: number | null
  strain?: number | null
  symptoms?: SymptomLog[]
}

const WEIGHTS = {
  hrv: 0.3,
  rhr: 0.15,
  sleep: 0.2,
  tsb: 0.15,
  symptoms: 0.2,
} as const

/** Minimum readings before a baseline is trustworthy. */
const MIN_BASELINE_SAMPLES = 4

export function computeReadiness(inputs: ReadinessInputs): Readiness {
  const { date, metrics, symptoms = [] } = inputs

  const sorted = [...metrics].sort((a, b) => a.metricDate.localeCompare(b.metricDate))
  const today = sorted.find((metric) => metric.metricDate === date) ?? sorted[sorted.length - 1]
  const history = sorted.filter((metric) => metric.metricDate < date)

  const components: ReadinessComponent[] = []
  const flags: string[] = []

  // --- HRV against personal baseline -------------------------------------
  const rmssdReady =
    history.filter((metric) => metric.hrvRmssd != null).length >= MIN_BASELINE_SAMPLES &&
    today?.hrvRmssd != null
  const hrvValue = (metric: DailyMetric) => (rmssdReady ? metric.hrvRmssd : metric.hrvSdnn) ?? null

  const hrvBaseline = rollingMean(history.map(hrvValue), 7)
  const hrvSd = rollingSd(history.map(hrvValue), 7)
  const hrvToday = today ? hrvValue(today) : null

  let hrvZ: number | null = null
  let hrvScore = 50
  let hrvDetail = 'No HRV reading available'

  if (hrvToday != null && hrvBaseline != null && hrvBaseline > 0) {
    const deltaPct = ((hrvToday - hrvBaseline) / hrvBaseline) * 100
    hrvZ = hrvSd && hrvSd > 0 ? round2((hrvToday - hrvBaseline) / hrvSd) : null

    // Banded on percentage deviation; SDNN is noisy enough that a z-score
    // alone would swing the whole score on normal night-to-night variation.
    if (deltaPct >= 5) hrvScore = 92
    else if (deltaPct >= -5) hrvScore = 80
    else if (deltaPct >= -12) hrvScore = 62
    else if (deltaPct >= -20) hrvScore = 38
    else hrvScore = 15

    hrvDetail = `${Math.round(hrvToday)} ms ${rmssdReady ? 'RMSSD' : 'SDNN'} vs ${Math.round(hrvBaseline)} ms baseline (${formatSigned(deltaPct)}%)`

    if (deltaPct <= -20) flags.push('hrv_suppressed')
  } else if (hrvToday != null) {
    hrvScore = 60
    hrvDetail = `${Math.round(hrvToday)} ms (baseline still forming)`
  }

  components.push({
    key: 'hrv',
    label: 'Heart rate variability',
    score: hrvScore,
    weight: WEIGHTS.hrv,
    detail: hrvDetail,
  })

  // --- Resting heart rate -------------------------------------------------
  const rhrBaseline = rollingMean(history.map((m) => m.restingHeartRate), 7)
  const rhrToday = today?.restingHeartRate ?? null

  let rhrScore = 50
  let rhrDetail = 'No resting heart rate available'

  if (rhrToday != null && rhrBaseline != null) {
    const delta = rhrToday - rhrBaseline
    if (delta <= -2) rhrScore = 92
    else if (delta <= 2) rhrScore = 80
    else if (delta <= 5) rhrScore = 55
    else if (delta <= 8) rhrScore = 30
    else rhrScore = 12

    rhrDetail = `${rhrToday} bpm vs ${Math.round(rhrBaseline)} bpm baseline (${formatSigned(delta)})`

    // An elevated resting heart rate with suppressed HRV is the classic
    // illness or deep-fatigue pattern and is worth naming explicitly.
    if (delta >= 5 && hrvScore <= 40) flags.push('possible_illness_or_overreaching')
  } else if (rhrToday != null) {
    rhrScore = 65
    rhrDetail = `${rhrToday} bpm (baseline still forming)`
  }

  components.push({
    key: 'rhr',
    label: 'Resting heart rate',
    score: rhrScore,
    weight: WEIGHTS.rhr,
    detail: rhrDetail,
  })

  // --- Sleep --------------------------------------------------------------
  const sleepSeconds = today?.sleepSeconds ?? null
  const recentSleep = [today, ...history.slice(-2)]
    .map((metric) => metric?.sleepSeconds)
    .filter((value): value is number => value != null)

  let sleepScore = 50
  let sleepDetail = 'No sleep data available'

  if (recentSleep.length > 0) {
    const avgHours = recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length / 3600

    if (avgHours >= 7.5) sleepScore = 95
    else if (avgHours >= 7) sleepScore = 82
    else if (avgHours >= 6.5) sleepScore = 62
    else if (avgHours >= 6) sleepScore = 42
    else sleepScore = 18

    // Deep sleep is where most physical recovery happens; a normal total with
    // very little deep sleep is not the same as a good night.
    const deep = today?.sleepDeep ?? null
    if (deep != null && sleepSeconds && sleepSeconds > 0) {
      const deepPct = (deep / sleepSeconds) * 100
      if (deepPct < 10) {
        sleepScore = Math.round(sleepScore * 0.9)
        flags.push('low_deep_sleep')
      }
    }

    sleepDetail = `${avgHours.toFixed(1)} h average over ${recentSleep.length} night${recentSleep.length === 1 ? '' : 's'}`

    if (avgHours < 6) flags.push('sleep_debt')
  }

  components.push({
    key: 'sleep',
    label: 'Sleep',
    score: sleepScore,
    weight: WEIGHTS.sleep,
    detail: sleepDetail,
  })

  // --- Training stress balance -------------------------------------------
  const tsb = inputs.tsb ?? null
  const acwr = inputs.acwr ?? null

  let tsbScore = 70
  let tsbDetail = 'Not enough training history for a load balance'

  if (tsb != null) {
    // Mildly negative TSB is the productive training range; deeply negative
    // means accumulated fatigue, strongly positive means detraining or taper.
    if (tsb >= 5) tsbScore = 88
    else if (tsb >= -10) tsbScore = 85
    else if (tsb >= -20) tsbScore = 65
    else if (tsb >= -30) tsbScore = 40
    else tsbScore = 20

    tsbDetail = `TSB ${tsb > 0 ? '+' : ''}${Math.round(tsb)}`

    if (tsb <= -30) flags.push('deep_fatigue')
  }

  if (acwr != null) {
    tsbDetail += `, ACWR ${acwr.toFixed(2)}`
    if (acwr > 1.5) {
      tsbScore = Math.min(tsbScore, 35)
      flags.push('acwr_spike')
    } else if (acwr > 1.3) {
      tsbScore = Math.min(tsbScore, 55)
      flags.push('acwr_elevated')
    } else if (acwr < 0.8) {
      flags.push('acwr_detraining')
    }
  }

  const monotony = inputs.monotony ?? null
  if (monotony != null && monotony >= 2) {
    tsbScore = Math.round(tsbScore * 0.9)
    tsbDetail += `, monotony ${monotony.toFixed(1)}`
    flags.push('high_monotony')
  }

  components.push({
    key: 'load',
    label: 'Training load balance',
    score: tsbScore,
    weight: WEIGHTS.tsb,
    detail: tsbDetail,
  })

  // --- Symptoms -----------------------------------------------------------
  // Weighted as heavily as sleep. Knee health is the top priority, so a
  // reported pain score has to move readiness on its own rather than waiting
  // to surface indirectly through HRV.
  const recentSymptoms = symptoms.filter((symptom) => withinDays(symptom.logDate, date, 7))
  const maxPain7d = recentSymptoms.length
    ? Math.max(...recentSymptoms.map((symptom) => symptom.painScore))
    : null
  const painToday = symptoms
    .filter((symptom) => symptom.logDate === date)
    .reduce((max, symptom) => Math.max(max, symptom.painScore), 0)

  let symptomScore = 95
  let symptomDetail = 'No symptoms logged in the last 7 days'

  if (maxPain7d != null) {
    const effective = Math.max(painToday, maxPain7d * 0.7)

    if (effective === 0) symptomScore = 95
    else if (effective <= 2) symptomScore = 80
    else if (effective <= 3) symptomScore = 62
    else if (effective <= 5) symptomScore = 38
    else symptomScore = 12

    symptomDetail = painToday
      ? `Pain ${painToday}/10 today, peak ${maxPain7d}/10 this week`
      : `No pain today, peak ${maxPain7d}/10 this week`

    if (painToday >= 4) flags.push('pain_threshold_exceeded')
    if (recentSymptoms.some((symptom) => symptom.swelling || symptom.locking || symptom.instability)) {
      flags.push('mechanical_red_flag')
      symptomScore = Math.min(symptomScore, 20)
    }
  }

  components.push({
    key: 'symptoms',
    label: 'Symptoms',
    score: symptomScore,
    weight: WEIGHTS.symptoms,
    detail: symptomDetail,
  })

  // --- Composite ----------------------------------------------------------
  const weightedTotal = components.reduce(
    (sum, component) => sum + component.score * component.weight,
    0
  )
  let score = Math.round(clamp(weightedTotal, 0, 100))

  // A mechanical red flag or acute pain caps the headline score regardless of
  // how good the rest of the physiology looks; otherwise a well-rested athlete
  // with a swollen knee would read as "fresh".
  if (flags.includes('mechanical_red_flag')) score = Math.min(score, 30)
  else if (flags.includes('pain_threshold_exceeded')) score = Math.min(score, 45)

  return {
    metricDate: date,
    score,
    level: levelForScore(score),
    components,
    flags: [...new Set(flags)],
    inputs: {
      hrvSdnn: hrvToday,
      hrvBaseline7d: hrvBaseline,
      hrvZScore: hrvZ,
      rhr: rhrToday,
      rhrBaseline7d: rhrBaseline,
      sleepSeconds,
      ctl: inputs.ctl ?? null,
      atl: inputs.atl ?? null,
      tsb,
      acwr,
      monotony,
      strain: inputs.strain ?? null,
      maxPain7d,
    },
  }
}

export function levelForScore(score: number): ReadinessLevel {
  if (score >= 78) return 'fresh'
  if (score >= 58) return 'moderate'
  if (score >= 38) return 'fatigued'
  return 'compromised'
}

/**
 * How the plan should respond to a readiness level.
 * Volume is never added on a low score; the only lever is intensity.
 */
export function readinessGuidance(level: ReadinessLevel): {
  action: 'proceed' | 'proceed_with_care' | 'reduce_intensity' | 'recovery_only'
  summary: string
} {
  switch (level) {
    case 'fresh':
      return { action: 'proceed', summary: 'Train as planned. A quality session is well supported today.' }
    case 'moderate':
      return {
        action: 'proceed_with_care',
        summary: 'Train as planned, but hold easy sessions genuinely easy and stop intervals early if form degrades.',
      }
    case 'fatigued':
      return {
        action: 'reduce_intensity',
        summary: 'Drop the intensity, keep the duration. Swap intervals for steady aerobic work.',
      }
    case 'compromised':
      return {
        action: 'recovery_only',
        summary: 'Recovery only: easy swim, high-cadence spin, or complete rest. No impact, no intensity.',
      }
  }
}

// ---------------------------------------------------------------------------

function rollingMean(values: (number | null)[], days: number): number | null {
  const recent = values.filter((value): value is number => value != null).slice(-days)
  if (recent.length < MIN_BASELINE_SAMPLES) return null
  return round2(recent.reduce((a, b) => a + b, 0) / recent.length)
}

function rollingSd(values: (number | null)[], days: number): number | null {
  const recent = values.filter((value): value is number => value != null).slice(-days)
  if (recent.length < MIN_BASELINE_SAMPLES) return null

  const mean = recent.reduce((a, b) => a + b, 0) / recent.length
  const variance = recent.reduce((sum, value) => sum + (value - mean) ** 2, 0) / recent.length
  return round2(Math.sqrt(variance))
}

function withinDays(date: string, reference: string, days: number): boolean {
  const d = new Date(`${date}T00:00:00Z`).getTime()
  const r = new Date(`${reference}T00:00:00Z`).getTime()
  const diff = (r - d) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff < days
}

function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded > 0 ? `+${rounded}` : `${rounded}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
