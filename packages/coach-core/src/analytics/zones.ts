/**
 * Heart rate zones.
 *
 * The previous implementation ignored user_hr_zones_config and assumed a max
 * HR of 185 with fixed percentage bands. That produced zone distributions that
 * disagreed with the configured zones shown elsewhere in the dashboard. Zones
 * now come from the athlete's configured thresholds, with percentage-of-max
 * only as a last-resort fallback.
 */

import type { HeartRateSample, HrZoneConfig, ZoneSeconds } from '../types'
import { emptyZoneSeconds } from '../types'

export const DEFAULT_MAX_HR = 185
export const DEFAULT_RESTING_HR = 52

/**
 * Zone boundaries derived from percentage of max HR, used only when the
 * athlete has no configured zones.
 */
export function defaultZoneConfig(maxHr = DEFAULT_MAX_HR, restingHr = DEFAULT_RESTING_HR): HrZoneConfig {
  return {
    maxHr,
    restingHr,
    z1: Math.round(maxHr * 0.5),
    z2: Math.round(maxHr * 0.6),
    z3: Math.round(maxHr * 0.7),
    z4: Math.round(maxHr * 0.8),
    z5: Math.round(maxHr * 0.9),
  }
}

/** Which zone a heart rate falls in (1-5). Below z1 counts as zone 1. */
export function zoneForBpm(bpm: number, config: HrZoneConfig): 1 | 2 | 3 | 4 | 5 {
  if (bpm >= config.z5) return 5
  if (bpm >= config.z4) return 4
  if (bpm >= config.z3) return 3
  if (bpm >= config.z2) return 2
  return 1
}

/**
 * Time in each zone from a heart rate series.
 *
 * Sample spacing is taken from the gap to the next sample rather than assumed,
 * because Apple Watch HR sampling varies between roughly 1 and 5 seconds
 * depending on activity type and power state. Gaps longer than 60 s are
 * treated as recording pauses and excluded rather than credited to a zone.
 */
export function computeZoneSeconds(
  samples: HeartRateSample[],
  config: HrZoneConfig
): ZoneSeconds {
  const result = emptyZoneSeconds()
  if (samples.length === 0) return result

  const sorted = [...samples].sort((a, b) => a.t - b.t)
  const MAX_GAP_SECONDS = 60

  for (let i = 0; i < sorted.length; i++) {
    const sample = sorted[i]!
    const next = sorted[i + 1]

    let duration: number
    if (next) {
      duration = next.t - sample.t
      if (duration > MAX_GAP_SECONDS || duration <= 0) continue
    } else {
      // Final sample: assume the median spacing rather than a magic constant.
      duration = sorted.length > 1 ? medianSpacing(sorted) : 1
    }

    const zone = zoneForBpm(sample.bpm, config)
    result[`z${zone}` as keyof ZoneSeconds] += duration
  }

  for (const key of Object.keys(result) as (keyof ZoneSeconds)[]) {
    result[key] = Math.round(result[key])
  }

  return result
}

function medianSpacing(sorted: HeartRateSample[]): number {
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]!.t - sorted[i - 1]!.t
    if (gap > 0 && gap <= 60) gaps.push(gap)
  }
  if (gaps.length === 0) return 1
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)] ?? 1
}

/**
 * Fraction of heart rate reserve (Karvonen). This is the basis for both TRIMP
 * and hrTSS, and is more stable across fitness changes than percentage of max.
 */
export function heartRateReserveFraction(bpm: number, config: HrZoneConfig): number {
  const reserve = config.maxHr - config.restingHr
  if (reserve <= 0) return 0
  return clamp((bpm - config.restingHr) / reserve, 0, 1)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Percentage split across zones, for display and polarisation checks. */
export function zoneDistribution(zones: ZoneSeconds): Record<keyof ZoneSeconds, number> {
  const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5
  if (total === 0) return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }

  return {
    z1: round1((zones.z1 / total) * 100),
    z2: round1((zones.z2 / total) * 100),
    z3: round1((zones.z3 / total) * 100),
    z4: round1((zones.z4 / total) * 100),
    z5: round1((zones.z5 / total) * 100),
  }
}

/**
 * Share of training time spent easy (zones 1-2) versus hard (zones 4-5).
 *
 * Seiler's polarised model targets roughly 80% easy. The middle zone is called
 * out separately because drifting into it is the classic endurance failure
 * mode: too hard to recover from, too easy to drive adaptation.
 */
export function polarisationIndex(zones: ZoneSeconds): {
  easyPct: number
  moderatePct: number
  hardPct: number
  isPolarised: boolean
} {
  const distribution = zoneDistribution(zones)
  const easy = distribution.z1 + distribution.z2
  const moderate = distribution.z3
  const hard = distribution.z4 + distribution.z5

  return {
    easyPct: round1(easy),
    moderatePct: round1(moderate),
    hardPct: round1(hard),
    isPolarised: easy >= 75 && moderate <= 15,
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
