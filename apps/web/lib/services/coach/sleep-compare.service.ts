/**
 * Apple vs Polar sleep deltas for the Today rail.
 * Comparison only — never feeds readiness / coach tools.
 */

import type { DailyMetric } from '@petehome/coach-core'

import {
  getPolarSleepNight,
  getPolarSleepNightsInRange,
  mapPolarNightForCompare,
  polarAsleepSeconds,
  type PolarSleepCompareNight,
  type PolarSleepNightRow,
} from '@/lib/services/polar.service'
import type {
  LastNightSleepView,
  SleepCompareBias,
  SleepCompareDeltas,
  SleepCompareView,
} from '@/lib/types/coach-ui.types'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function minutesDelta(
  polarMinutes: number | null | undefined,
  appleMinutes: number | null | undefined
): number | null {
  if (polarMinutes == null || appleMinutes == null) return null
  return polarMinutes - appleMinutes
}

function hoursDelta(
  polarHours: number | null | undefined,
  appleHours: number | null | undefined
): number | null {
  if (polarHours == null || appleHours == null) return null
  return round1(polarHours - appleHours)
}

function offsetMinutes(polarIso: string | null, appleIso: string | null): number | null {
  if (!polarIso || !appleIso) return null
  return Math.round(
    (new Date(polarIso).getTime() - new Date(appleIso).getTime()) / 60_000
  )
}

function appleFromMetric(night: DailyMetric): LastNightSleepView | null {
  if (night.sleepSeconds == null) return null
  return {
    hours: round1(night.sleepSeconds / 3600),
    inBedHours:
      night.sleepInBed != null ? round1(night.sleepInBed / 3600) : null,
    efficiencyPct:
      night.sleepInBed != null && night.sleepInBed > 0
        ? Math.round((night.sleepSeconds / night.sleepInBed) * 100)
        : null,
    deepMinutes: night.sleepDeep != null ? Math.round(night.sleepDeep / 60) : null,
    remMinutes: night.sleepRem != null ? Math.round(night.sleepRem / 60) : null,
    coreMinutes: night.sleepCore != null ? Math.round(night.sleepCore / 60) : null,
    awakeMinutes: night.sleepAwake != null ? Math.round(night.sleepAwake / 60) : null,
    start: night.sleepStart ?? null,
    end: night.sleepEnd ?? null,
    breathingDisturbancesElevated: night.breathingDisturbancesElevated ?? null,
  }
}

function buildDeltas(
  apple: LastNightSleepView,
  polar: PolarSleepCompareNight
): SleepCompareDeltas {
  return {
    asleepHours: hoursDelta(polar.hours, apple.hours),
    deepMinutes: minutesDelta(polar.deepMinutes, apple.deepMinutes),
    remMinutes: minutesDelta(polar.remMinutes, apple.remMinutes),
    lightVsCoreMinutes: minutesDelta(polar.lightMinutes, apple.coreMinutes),
    awakeMinutes: minutesDelta(polar.awakeMinutes, apple.awakeMinutes),
    bedtimeOffsetMinutes: offsetMinutes(polar.start, apple.start),
    wakeOffsetMinutes: offsetMinutes(polar.end, apple.end),
  }
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function buildBias(
  pairs: { apple: LastNightSleepView; polar: PolarSleepCompareNight }[]
): SleepCompareBias | null {
  if (pairs.length === 0) return null

  const asleepDeltas: number[] = []
  const deepPctDeltas: number[] = []
  let polarHigherAsleep = 0
  let polarLowerAsleep = 0

  for (const { apple, polar } of pairs) {
    const dHours = hoursDelta(polar.hours, apple.hours)
    if (dHours != null) {
      asleepDeltas.push(dHours)
      if (dHours > 0.05) polarHigherAsleep += 1
      else if (dHours < -0.05) polarLowerAsleep += 1
    }

    const appleStaged =
      (apple.deepMinutes ?? 0) + (apple.remMinutes ?? 0) + (apple.coreMinutes ?? 0)
    const polarStaged =
      (polar.deepMinutes ?? 0) + (polar.remMinutes ?? 0) + (polar.lightMinutes ?? 0)
    if (
      apple.deepMinutes != null &&
      polar.deepMinutes != null &&
      appleStaged > 0 &&
      polarStaged > 0
    ) {
      const appleDeepPct = (apple.deepMinutes / appleStaged) * 100
      const polarDeepPct = (polar.deepMinutes / polarStaged) * 100
      deepPctDeltas.push(polarDeepPct - appleDeepPct)
    }
  }

  const meanAsleep = mean(asleepDeltas)
  const meanDeepPct = mean(deepPctDeltas)

  return {
    nights: pairs.length,
    meanAsleepHoursDelta: meanAsleep != null ? round1(meanAsleep) : null,
    meanDeepPctDelta: meanDeepPct != null ? Math.round(meanDeepPct) : null,
    polarHigherAsleepNights: polarHigherAsleep,
    polarLowerAsleepNights: polarLowerAsleep,
  }
}

function daysAgoChicago(fromDate: string, days: number): string {
  const [y, m, d] = fromDate.split('-').map(Number)
  const utc = Date.UTC(y!, m! - 1, d!)
  const shifted = new Date(utc - days * 86_400_000)
  return shifted.toISOString().slice(0, 10)
}

/**
 * Build last-night Polar vs Apple compare + 14-day bias when both sources exist.
 */
export async function buildSleepCompare(
  date: string,
  appleMetrics: DailyMetric[]
): Promise<SleepCompareView | null> {
  const appleByDate = new Map(
    appleMetrics
      .map((m) => [m.metricDate, appleFromMetric(m)] as const)
      .filter((entry): entry is [string, LastNightSleepView] => entry[1] != null)
  )

  const polarTonight = await getPolarSleepNight(date).catch(() => null)
  if (!polarTonight && appleByDate.size === 0) return null

  const start = daysAgoChicago(date, 13)
  const polarRows = await getPolarSleepNightsInRange(start, date).catch(
    () => [] as PolarSleepNightRow[]
  )
  const polarByDate = new Map(polarRows.map((row) => [row.date, row]))

  const pairs: { apple: LastNightSleepView; polar: PolarSleepCompareNight }[] = []
  for (const [d, apple] of appleByDate) {
    const polarRow = polarByDate.get(d)
    if (!polarRow) continue
    // Need enough Polar stage data to be a real night
    if (polarAsleepSeconds(polarRow) == null) continue
    pairs.push({ apple, polar: mapPolarNightForCompare(polarRow) })
  }

  const appleTonight = appleByDate.get(date) ?? null
  const polarMapped = polarTonight ? mapPolarNightForCompare(polarTonight) : null

  if (!appleTonight && !polarMapped) return null

  const deltas =
    appleTonight && polarMapped ? buildDeltas(appleTonight, polarMapped) : null

  return {
    polar: polarMapped,
    deltas,
    bias: buildBias(pairs),
  }
}
