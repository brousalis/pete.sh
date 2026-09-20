/**
 * Training load.
 *
 * Every session is reduced to a single TSS number so loads from three
 * different sports can be summed into one progression curve. Which formula
 * applies depends on what was actually measured:
 *
 *   rTSS  running with pace     — pace against threshold pace
 *   sTSS  swimming with pace    — pace against CSS
 *   pTSS  cycling with power    — normalised power against FTP
 *   hrTSS anything with HR      — heart rate reserve against threshold
 *   estimated  last resort      — duration x a per-sport intensity constant
 *
 * The ladder matters: pace and power are direct measures of output, heart rate
 * is a lagging proxy that drifts with heat and fatigue, and duration alone is
 * a guess. Each activity records which method was used so a suspicious CTL
 * curve can be traced back to its inputs.
 */

import type { HeartRateSample, HrZoneConfig, Sport, TssMethod, ZoneSeconds } from '../types'
import { clamp, heartRateReserveFraction } from './zones'

export interface LoadInputs {
  sport: Sport
  durationSeconds: number
  distanceMeters?: number | null
  hrSamples?: HeartRateSample[]
  hrAverage?: number | null
  normalizedPower?: number | null
  zoneConfig: HrZoneConfig
  thresholds: AthleteThresholds
}

export interface AthleteThresholds {
  /** Lactate threshold heart rate. Falls back to ~88% of max when unknown. */
  lthr?: number | null
  /** Threshold running speed in m/s (roughly 1-hour race pace). */
  runThresholdSpeed?: number | null
  /** Critical swim speed in m/s. */
  cssSpeed?: number | null
  /** Functional threshold power in watts. */
  ftpWatts?: number | null
}

export interface LoadResult {
  tss: number
  method: TssMethod
  intensityFactor: number | null
  trimp: number | null
  notes?: string
}

/** Per-sport TSS-per-hour used when nothing but duration is known. */
const ESTIMATED_TSS_PER_HOUR: Record<string, number> = {
  swim: 55,
  bike: 55,
  run: 70,
  brick: 75,
  strength: 35,
  pt: 10,
  walk: 20,
  hiit: 90,
  cross: 50,
  other: 40,
  rest: 0,
}

/**
 * Banister TRIMP.
 *
 * Weights time by an exponential of heart rate reserve, so a minute at
 * threshold counts far more than a minute easy. Used both as a load measure in
 * its own right and as the basis for hrTSS.
 */
export function computeTrimp(
  samples: HeartRateSample[],
  config: HrZoneConfig,
  sex: 'male' | 'female' = 'male'
): number {
  if (samples.length === 0) return 0

  // Sex-specific exponential weighting from Banister's original work.
  const factor = sex === 'male' ? 1.92 : 1.67
  const coefficient = sex === 'male' ? 0.64 : 0.86

  const sorted = [...samples].sort((a, b) => a.t - b.t)
  let trimp = 0

  for (let i = 0; i < sorted.length; i++) {
    const sample = sorted[i]!
    const next = sorted[i + 1]
    const gap = next ? next.t - sample.t : 1
    if (gap <= 0 || gap > 60) continue

    const hrr = heartRateReserveFraction(sample.bpm, config)
    const minutes = gap / 60
    trimp += minutes * hrr * coefficient * Math.exp(factor * hrr)
  }

  return round2(trimp)
}

/**
 * Heart-rate TSS.
 *
 * IF is heart rate reserve at the session average divided by heart rate
 * reserve at threshold, so 1.0 means an hour at threshold, which by definition
 * scores 100.
 */
export function computeHrTss(
  durationSeconds: number,
  avgHr: number,
  config: HrZoneConfig,
  lthr?: number | null
): { tss: number; intensityFactor: number } {
  const threshold = lthr ?? Math.round(config.maxHr * 0.88)
  const thresholdFraction = heartRateReserveFraction(threshold, config)
  const sessionFraction = heartRateReserveFraction(avgHr, config)

  if (thresholdFraction <= 0) return { tss: 0, intensityFactor: 0 }

  const intensityFactor = clamp(sessionFraction / thresholdFraction, 0, 1.6)
  const hours = durationSeconds / 3600
  const tss = hours * intensityFactor * intensityFactor * 100

  return { tss: round2(tss), intensityFactor: round3(intensityFactor) }
}

/** Pace-based TSS for running and swimming. Identical maths, different threshold. */
function paceBasedTss(
  durationSeconds: number,
  distanceMeters: number,
  thresholdSpeed: number
): { tss: number; intensityFactor: number } {
  if (durationSeconds <= 0 || distanceMeters <= 0 || thresholdSpeed <= 0) {
    return { tss: 0, intensityFactor: 0 }
  }

  const speed = distanceMeters / durationSeconds
  const intensityFactor = clamp(speed / thresholdSpeed, 0, 1.6)
  const hours = durationSeconds / 3600
  const tss = hours * intensityFactor * intensityFactor * 100

  return { tss: round2(tss), intensityFactor: round3(intensityFactor) }
}

/** Power-based TSS, the reference definition the others approximate. */
export function computePowerTss(
  durationSeconds: number,
  normalizedPower: number,
  ftp: number
): { tss: number; intensityFactor: number } {
  if (ftp <= 0) return { tss: 0, intensityFactor: 0 }

  const intensityFactor = normalizedPower / ftp
  const tss = ((durationSeconds * normalizedPower * intensityFactor) / (ftp * 3600)) * 100

  return { tss: round2(tss), intensityFactor: round3(intensityFactor) }
}

/**
 * Pick the best available method and compute load.
 */
export function computeLoad(inputs: LoadInputs): LoadResult {
  const {
    sport,
    durationSeconds,
    distanceMeters,
    hrSamples,
    hrAverage,
    normalizedPower,
    zoneConfig,
    thresholds,
  } = inputs

  if (durationSeconds <= 0 || sport === 'rest') {
    return { tss: 0, method: 'estimated', intensityFactor: null, trimp: null }
  }

  const trimp = hrSamples?.length ? computeTrimp(hrSamples, zoneConfig) : null

  // Cycling with power is the most accurate signal available.
  if (sport === 'bike' && normalizedPower && thresholds.ftpWatts) {
    const { tss, intensityFactor } = computePowerTss(
      durationSeconds,
      normalizedPower,
      thresholds.ftpWatts
    )
    return { tss, method: 'pTSS', intensityFactor, trimp }
  }

  if (sport === 'run' && distanceMeters && thresholds.runThresholdSpeed) {
    const { tss, intensityFactor } = paceBasedTss(
      durationSeconds,
      distanceMeters,
      thresholds.runThresholdSpeed
    )
    return { tss, method: 'rTSS', intensityFactor, trimp }
  }

  if (sport === 'swim' && distanceMeters && thresholds.cssSpeed) {
    const { tss, intensityFactor } = paceBasedTss(
      durationSeconds,
      distanceMeters,
      thresholds.cssSpeed
    )
    return { tss, method: 'sTSS', intensityFactor, trimp }
  }

  // Heart rate works for anything, including strength and indoor sessions.
  const avgHr =
    hrAverage ??
    (hrSamples?.length
      ? hrSamples.reduce((sum, sample) => sum + sample.bpm, 0) / hrSamples.length
      : null)

  if (avgHr && avgHr > zoneConfig.restingHr) {
    const { tss, intensityFactor } = computeHrTss(
      durationSeconds,
      avgHr,
      zoneConfig,
      thresholds.lthr
    )
    return { tss, method: 'hrTSS', intensityFactor, trimp }
  }

  const perHour = ESTIMATED_TSS_PER_HOUR[sport] ?? 40
  return {
    tss: round2((durationSeconds / 3600) * perHour),
    method: 'estimated',
    intensityFactor: null,
    trimp,
    notes: 'No heart rate, pace or power data; load estimated from duration.',
  }
}

/**
 * Aerobic decoupling: the drift in heart-rate cost between the first and
 * second half of a steady session.
 *
 * Above about 5% on an aerobic session means the aerobic base is not yet
 * supporting the duration. During a return from injury this is the cleanest
 * early signal that volume is being added faster than fitness is arriving.
 */
export function computeDecoupling(
  samples: HeartRateSample[],
  distanceMeters?: number | null
): number | null {
  if (samples.length < 20 || !distanceMeters || distanceMeters <= 0) return null

  const sorted = [...samples].sort((a, b) => a.t - b.t)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || !last) return null

  const totalTime = last.t - first.t
  if (totalTime <= 0) return null

  const midpoint = first.t + totalTime / 2
  const firstHalf = sorted.filter((sample) => sample.t <= midpoint)
  const secondHalf = sorted.filter((sample) => sample.t > midpoint)

  if (firstHalf.length < 5 || secondHalf.length < 5) return null

  const avg = (list: HeartRateSample[]) =>
    list.reduce((sum, sample) => sum + sample.bpm, 0) / list.length

  // Even pacing is assumed, so speed is the same in both halves and the ratio
  // reduces to the inverse ratio of average heart rates.
  const firstHalfHr = avg(firstHalf)
  const secondHalfHr = avg(secondHalf)
  if (firstHalfHr <= 0) return null

  const drift = ((secondHalfHr - firstHalfHr) / firstHalfHr) * 100
  return round2(drift)
}

/** Total seconds recorded across all zones. */
export function totalZoneSeconds(zones: ZoneSeconds): number {
  return zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
