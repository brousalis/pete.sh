/**
 * Apple vs Polar sleep deltas for the Today rail and More detail page.
 * Comparison only — never feeds readiness / coach tools.
 */

import type { DailyMetric } from '@petehome/coach-core'

import { getDailyMetrics } from '@/lib/services/coach/coach-data.service'
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
  PolarSleepNightView,
  SleepCompareBias,
  SleepCompareDeltas,
  SleepCompareDetailView,
  SleepCompareLean,
  SleepCompareLeanVerdict,
  SleepCompareSeriesPoint,
  SleepCompareView,
  SleepNightAgreement,
  SleepNightCompareRow,
  SleepStageAverageMinutes,
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

function toPolarView(polar: PolarSleepCompareNight): PolarSleepNightView {
  return {
    date: polar.date,
    hours: polar.hours,
    efficiencyPct: polar.efficiencyPct,
    lightMinutes: polar.lightMinutes,
    deepMinutes: polar.deepMinutes,
    remMinutes: polar.remMinutes,
    awakeMinutes: polar.awakeMinutes,
    unrecognizedMinutes: polar.unrecognizedMinutes,
    sleepScore: polar.sleepScore,
    start: polar.start,
    end: polar.end,
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

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2
  }
  return sorted[mid]!
}

function deepPct(
  deep: number | null,
  rem: number | null,
  lightOrCore: number | null
): number | null {
  if (deep == null) return null
  const staged = (deep ?? 0) + (rem ?? 0) + (lightOrCore ?? 0)
  if (staged <= 0) return null
  return (deep / staged) * 100
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

    const appleDeep = deepPct(apple.deepMinutes, apple.remMinutes, apple.coreMinutes)
    const polarDeep = deepPct(polar.deepMinutes, polar.remMinutes, polar.lightMinutes)
    if (appleDeep != null && polarDeep != null) {
      deepPctDeltas.push(polarDeep - appleDeep)
    }
  }

  const meanAsleep = mean(asleepDeltas)
  const meanDeepPctVal = mean(deepPctDeltas)

  return {
    nights: pairs.length,
    meanAsleepHoursDelta: meanAsleep != null ? round1(meanAsleep) : null,
    meanDeepPctDelta: meanDeepPctVal != null ? Math.round(meanDeepPctVal) : null,
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

function chicagoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function formatSignedHours(deltaH: number): string {
  const mins = Math.round(Math.abs(deltaH) * 60)
  if (mins < 60) return `${mins} minutes`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h} hour${h === 1 ? '' : 's'}`
  return `${h}h ${m}m`
}

function isCloseNight(deltas: SleepCompareDeltas | null): boolean {
  if (!deltas) return false
  const asleepOk =
    deltas.asleepHours != null && Math.abs(deltas.asleepHours) <= 20 / 60
  const bedOk =
    deltas.bedtimeOffsetMinutes != null && Math.abs(deltas.bedtimeOffsetMinutes) <= 30
  return asleepOk && bedOk
}

function averageStages(
  nights: {
    deep: number | null
    rem: number | null
    lightOrCore: number | null
    awake: number | null
    unrecognized: number | null
  }[]
): SleepStageAverageMinutes {
  if (nights.length === 0) {
    return {
      deepMinutes: null,
      remMinutes: null,
      lightOrCoreMinutes: null,
      awakeMinutes: null,
      unrecognizedMinutes: null,
    }
  }
  const avg = (
    pick: (n: (typeof nights)[0]) => number | null
  ): number | null => {
    const vals = nights.map(pick).filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return Math.round(mean(vals)!)
  }
  return {
    deepMinutes: avg((n) => n.deep),
    remMinutes: avg((n) => n.rem),
    lightOrCoreMinutes: avg((n) => n.lightOrCore),
    awakeMinutes: avg((n) => n.awake),
    unrecognizedMinutes: avg((n) => n.unrecognized),
  }
}

function buildLean(input: {
  overlappingNights: number
  meanAsleepDeltaH: number | null
  medianBedOffsetMin: number | null
  meanDeepPctDelta: number | null
  meanPolarScore: number | null
  closeNightPct: number | null
}): SleepCompareLean {
  const {
    overlappingNights,
    meanAsleepDeltaH,
    medianBedOffsetMin,
    meanDeepPctDelta,
    meanPolarScore,
    closeNightPct,
  } = input

  if (overlappingNights < 5) {
    return {
      verdict: 'insufficient',
      headline: 'Not enough nights yet',
      bullets: [
        overlappingNights === 0
          ? 'No nights yet where both Apple Watch and Polar Loop recorded sleep.'
          : `Only ${overlappingNights} night${overlappingNights === 1 ? '' : 's'} with both devices — need a handful more before a lean is useful.`,
        'Wear both overnight and sync Polar Flow in the morning.',
        'Coach still uses Apple Watch only.',
      ],
    }
  }

  const absAsleep = meanAsleepDeltaH != null ? Math.abs(meanAsleepDeltaH) : null
  const absBed = medianBedOffsetMin != null ? Math.abs(medianBedOffsetMin) : null
  const absDeep = meanDeepPctDelta != null ? Math.abs(meanDeepPctDelta) : null

  let verdict: SleepCompareLeanVerdict
  let headline: string
  const bullets: string[] = []

  const agreeOnLength =
    absAsleep != null && absAsleep <= 0.33 && absBed != null && absBed <= 25

  if (agreeOnLength) {
    verdict = 'agree'
    headline = 'They mostly agree'
    bullets.push(
      absAsleep != null
        ? `On average, sleep length differs by about ${formatSignedHours(absAsleep)}.`
        : 'Sleep length looks similar night to night.'
    )
    if (absBed != null) {
      bullets.push(
        `Bedtime usually within about ${Math.round(absBed)} minutes of each other.`
      )
    }
  } else if (meanAsleepDeltaH != null && absAsleep != null && absAsleep >= 0.33) {
    verdict = meanAsleepDeltaH > 0 ? 'polar_longer' : 'polar_shorter'
    headline =
      meanAsleepDeltaH > 0
        ? 'Polar usually reads longer sleep'
        : 'Polar usually reads shorter sleep'
    bullets.push(
      `Polar says you sleep about ${formatSignedHours(meanAsleepDeltaH)} ${meanAsleepDeltaH > 0 ? 'more' : 'less'} than Apple on average.`
    )
    if (absBed != null && absBed > 25) {
      bullets.push(
        `They also disagree on when you fell asleep (about ${Math.round(absBed)} min apart).`
      )
    }
  } else if (absDeep != null && absDeep >= 8) {
    verdict = 'stages_diverge'
    headline = 'Biggest gap is sleep stages'
    bullets.push(
      meanDeepPctDelta != null && meanDeepPctDelta > 0
        ? `Polar credits you with about ${Math.round(absDeep)} percentage points more deep sleep.`
        : `Apple credits you with about ${Math.round(absDeep)} percentage points more deep sleep.`
    )
    if (absAsleep != null) {
      bullets.push(
        `Total sleep length is closer (about ${formatSignedHours(absAsleep)} apart).`
      )
    }
  } else {
    verdict = 'agree'
    headline = 'Mostly agree on length; stages differ'
    bullets.push(
      absAsleep != null
        ? `Sleep length is within about ${formatSignedHours(absAsleep)} on average.`
        : 'Sleep length looks reasonably close.'
    )
    if (absDeep != null && absDeep > 0) {
      bullets.push(`Deep-sleep share still differs by about ${Math.round(absDeep)} points.`)
    }
  }

  if (meanPolarScore != null && bullets.length < 2) {
    bullets.push(
      `Polar’s sleep score averages ${Math.round(meanPolarScore)} (Apple has no score here).`
    )
  } else if (closeNightPct != null && bullets.length < 2) {
    bullets.push(
      `${Math.round(closeNightPct)}% of nights land close on both length and bedtime.`
    )
  }

  const trimmed = bullets.slice(0, 2)
  trimmed.push(
    'Only a sleep study settles true accuracy — this is a practical lean for now.'
  )

  return {
    verdict,
    headline,
    bullets: trimmed,
  }
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
    if (polarAsleepSeconds(polarRow) == null) continue
    pairs.push({ apple, polar: mapPolarNightForCompare(polarRow) })
  }

  const appleTonight = appleByDate.get(date) ?? null
  const polarMapped = polarTonight ? mapPolarNightForCompare(polarTonight) : null

  if (!appleTonight && !polarMapped) return null

  const deltas =
    appleTonight && polarMapped ? buildDeltas(appleTonight, polarMapped) : null

  return {
    polar: polarMapped ? toPolarView(polarMapped) : null,
    deltas,
    bias: buildBias(pairs),
  }
}

/**
 * Full Apple vs Polar comparison for the More sleep-devices section.
 */
export async function buildSleepCompareDetail(
  days = 28
): Promise<SleepCompareDetailView> {
  const windowDays = Math.min(90, Math.max(7, Math.floor(days)))
  const end = chicagoToday()
  const start = daysAgoChicago(end, windowDays - 1)

  const [appleMetrics, polarRows] = await Promise.all([
    getDailyMetrics(start, end).catch(() => [] as DailyMetric[]),
    getPolarSleepNightsInRange(start, end).catch(() => [] as PolarSleepNightRow[]),
  ])

  const appleByDate = new Map(
    appleMetrics
      .map((m) => [m.metricDate, appleFromMetric(m)] as const)
      .filter((entry): entry is [string, LastNightSleepView] => entry[1] != null)
  )
  const polarByDate = new Map(
    polarRows
      .filter((row) => polarAsleepSeconds(row) != null)
      .map((row) => [row.date, row] as const)
  )

  const allDates = new Set<string>([...appleByDate.keys(), ...polarByDate.keys()])
  const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a))

  const nights: SleepNightCompareRow[] = []
  const overlapPairs: {
    apple: LastNightSleepView
    polar: PolarSleepCompareNight
    polarRow: PolarSleepNightRow
  }[] = []

  for (const date of sortedDates) {
    const apple = appleByDate.get(date) ?? null
    const polarRow = polarByDate.get(date) ?? null
    const polarMapped = polarRow ? mapPolarNightForCompare(polarRow) : null
    const polar = polarMapped ? toPolarView(polarMapped) : null
    const deltas = apple && polarMapped ? buildDeltas(apple, polarMapped) : null

    let agreement: SleepNightAgreement
    if (apple && polar) {
      agreement = isCloseNight(deltas) ? 'close' : 'off'
      overlapPairs.push({ apple, polar: polarMapped!, polarRow: polarRow! })
    } else if (polar) {
      agreement = 'polar_only'
    } else {
      agreement = 'apple_only'
    }

    nights.push({
      date,
      agreement,
      apple,
      polar,
      deltas,
      polarContinuity: polarRow?.continuity ?? null,
    })
  }

  const asleepDeltas: number[] = []
  const bedOffsets: number[] = []
  const wakeOffsets: number[] = []
  const deepPctDeltas: number[] = []
  const polarScores: number[] = []
  let closeCount = 0

  for (const { apple, polar } of overlapPairs) {
    const deltas = buildDeltas(apple, polar)
    if (deltas.asleepHours != null) asleepDeltas.push(deltas.asleepHours)
    if (deltas.bedtimeOffsetMinutes != null) bedOffsets.push(deltas.bedtimeOffsetMinutes)
    if (deltas.wakeOffsetMinutes != null) wakeOffsets.push(deltas.wakeOffsetMinutes)
    const aDeep = deepPct(apple.deepMinutes, apple.remMinutes, apple.coreMinutes)
    const pDeep = deepPct(polar.deepMinutes, polar.remMinutes, polar.lightMinutes)
    if (aDeep != null && pDeep != null) deepPctDeltas.push(pDeep - aDeep)
    if (polar.sleepScore != null) polarScores.push(polar.sleepScore)
    if (isCloseNight(deltas)) closeCount += 1
  }

  const overlappingNights = overlapPairs.length
  const meanAsleepDeltaH = mean(asleepDeltas)
  const medianBedOffsetMin = median(bedOffsets)
  const medianWakeOffsetMin = median(wakeOffsets)
  const meanDeepPctDelta = mean(deepPctDeltas)
  const meanPolarScore = mean(polarScores)
  const closeNightPct =
    overlappingNights > 0 ? Math.round((closeCount / overlappingNights) * 100) : null

  const summary = {
    meanAsleepDeltaH: meanAsleepDeltaH != null ? round1(meanAsleepDeltaH) : null,
    medianBedOffsetMin:
      medianBedOffsetMin != null ? Math.round(medianBedOffsetMin) : null,
    medianWakeOffsetMin:
      medianWakeOffsetMin != null ? Math.round(medianWakeOffsetMin) : null,
    meanDeepPctDelta: meanDeepPctDelta != null ? Math.round(meanDeepPctDelta) : null,
    meanPolarScore: meanPolarScore != null ? Math.round(meanPolarScore) : null,
    closeNightPct,
  }

  const lean = buildLean({
    overlappingNights,
    meanAsleepDeltaH: summary.meanAsleepDeltaH,
    medianBedOffsetMin: summary.medianBedOffsetMin,
    meanDeepPctDelta: summary.meanDeepPctDelta,
    meanPolarScore: summary.meanPolarScore,
    closeNightPct,
  })

  const seriesAsc = [...sortedDates].sort((a, b) => a.localeCompare(b))
  const series: SleepCompareSeriesPoint[] = seriesAsc.map((date) => {
    const apple = appleByDate.get(date) ?? null
    const polarRow = polarByDate.get(date)
    const polar = polarRow ? mapPolarNightForCompare(polarRow) : null
    const appleDeep = apple
      ? deepPct(apple.deepMinutes, apple.remMinutes, apple.coreMinutes)
      : null
    const polarDeep = polar
      ? deepPct(polar.deepMinutes, polar.remMinutes, polar.lightMinutes)
      : null
    return {
      date,
      appleHours: apple?.hours ?? null,
      polarHours: polar?.hours ?? null,
      appleDeepPct: appleDeep != null ? Math.round(appleDeep) : null,
      polarDeepPct: polarDeep != null ? Math.round(polarDeep) : null,
    }
  })

  const stageAverages = {
    apple: averageStages(
      overlapPairs.map(({ apple }) => ({
        deep: apple.deepMinutes,
        rem: apple.remMinutes,
        lightOrCore: apple.coreMinutes,
        awake: apple.awakeMinutes,
        unrecognized: null,
      }))
    ),
    polar: averageStages(
      overlapPairs.map(({ polar }) => ({
        deep: polar.deepMinutes,
        rem: polar.remMinutes,
        lightOrCore: polar.lightMinutes,
        awake: polar.awakeMinutes,
        unrecognized: polar.unrecognizedMinutes,
      }))
    ),
  }

  return {
    days: windowDays,
    overlappingNights,
    lean,
    summary,
    series,
    stageAverages,
    nights,
  }
}
