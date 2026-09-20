/**
 * Performance Management Chart and load-ratio safety metrics.
 *
 * Replaces the dashboard's previous heuristic, which averaged synthetic
 * per-day loads derived from the workout *type* over 7 and 28 days. That
 * produced a curve that moved when the schedule changed rather than when the
 * training changed. These are the standard exponentially weighted forms, fed
 * by measured TSS.
 */

import type { DailyLoad, PmcPoint, Sport } from '../types'

/** Fitness time constant, in days. */
export const CTL_TIME_CONSTANT = 42
/** Fatigue time constant, in days. */
export const ATL_TIME_CONSTANT = 7

export interface PmcOptions {
  ctlTimeConstant?: number
  atlTimeConstant?: number
  initialCtl?: number
  initialAtl?: number
}

/**
 * Build a day-by-day PMC series.
 *
 * Days with no training are included with a load of zero — that is the point
 * of the exponential decay, and skipping them would understate the effect of
 * a rest week.
 */
export function computePmc(loads: DailyLoad[], options: PmcOptions = {}): PmcPoint[] {
  if (loads.length === 0) return []

  const ctlTau = options.ctlTimeConstant ?? CTL_TIME_CONSTANT
  const atlTau = options.atlTimeConstant ?? ATL_TIME_CONSTANT

  const byDate = new Map<string, number>()
  for (const load of loads) {
    byDate.set(load.date, (byDate.get(load.date) ?? 0) + load.tss)
  }

  const dates = [...byDate.keys()].sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  if (!firstDate || !lastDate) return []

  const series: PmcPoint[] = []
  let ctl = options.initialCtl ?? 0
  let atl = options.initialAtl ?? 0

  for (const date of eachDay(firstDate, lastDate)) {
    const tss = byDate.get(date) ?? 0

    // TSB is yesterday's balance: it describes readiness entering the day,
    // before today's session is accounted for.
    const tsb = ctl - atl

    ctl = ctl + (tss - ctl) / ctlTau
    atl = atl + (tss - atl) / atlTau

    series.push({
      date,
      tss: round1(tss),
      ctl: round1(ctl),
      atl: round1(atl),
      tsb: round1(tsb),
    })
  }

  return series
}

/**
 * Acute:chronic workload ratio, exponentially weighted.
 *
 * The rolling-average form is sensitive to the arbitrary window edge; the
 * EWMA form (Williams et al.) decays smoothly and is what Gabbett's later work
 * uses. Below 0.8 is detraining, above 1.5 is the range associated with
 * sharply elevated injury risk. For an athlete returning from a knee injury
 * this is a guardrail input, not a statistic.
 */
export function computeAcwr(
  loads: DailyLoad[],
  options: { acuteDays?: number; chronicDays?: number } = {}
): number | null {
  const acuteDays = options.acuteDays ?? 7
  const chronicDays = options.chronicDays ?? 28

  if (loads.length === 0) return null

  const byDate = new Map<string, number>()
  for (const load of loads) {
    byDate.set(load.date, (byDate.get(load.date) ?? 0) + load.tss)
  }

  const dates = [...byDate.keys()].sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  if (!firstDate || !lastDate) return null

  const acuteLambda = 2 / (acuteDays + 1)
  const chronicLambda = 2 / (chronicDays + 1)

  let acute = 0
  let chronic = 0
  let dayCount = 0

  for (const date of eachDay(firstDate, lastDate)) {
    const tss = byDate.get(date) ?? 0
    acute = tss * acuteLambda + acute * (1 - acuteLambda)
    chronic = tss * chronicLambda + chronic * (1 - chronicLambda)
    dayCount++
  }

  // Under roughly three weeks of history the chronic term has not converged
  // and the ratio is meaningless rather than merely imprecise.
  if (dayCount < 21 || chronic <= 0) return null

  return round2(acute / chronic)
}

/**
 * Training monotony (Foster): mean daily load divided by its standard
 * deviation over a week. High monotony means every day looks the same, which
 * is associated with illness and overreaching even at modest total volume.
 */
export function computeMonotony(loads: DailyLoad[], days = 7): number | null {
  const window = lastNDays(loads, days)
  if (window.length < days) return null

  const values = window.map((day) => day.tss)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return null

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  const sd = Math.sqrt(variance)

  // A perfectly uniform week has zero deviation; report a high but finite
  // value rather than Infinity so downstream comparisons behave.
  if (sd === 0) return 99

  return round2(mean / sd)
}

/** Weekly load multiplied by monotony. Foster's composite overreaching signal. */
export function computeStrain(loads: DailyLoad[], days = 7): number | null {
  const monotony = computeMonotony(loads, days)
  if (monotony === null) return null

  const weeklyLoad = lastNDays(loads, days).reduce((sum, day) => sum + day.tss, 0)
  return round1(weeklyLoad * monotony)
}

/** Total TSS over the trailing window. */
export function weeklyLoad(loads: DailyLoad[], days = 7): number {
  return round1(lastNDays(loads, days).reduce((sum, day) => sum + day.tss, 0))
}

/** Ramp rate: this week's load against the previous week's, as a percentage. */
export function computeRampRate(loads: DailyLoad[]): number | null {
  const thisWeek = lastNDays(loads, 7)
  if (thisWeek.length < 7) return null

  const sorted = [...loads].sort((a, b) => a.date.localeCompare(b.date))
  const previousWeek = sorted.slice(-14, -7)
  if (previousWeek.length < 7) return null

  const current = thisWeek.reduce((sum, day) => sum + day.tss, 0)
  const previous = previousWeek.reduce((sum, day) => sum + day.tss, 0)
  if (previous <= 0) return null

  return round1(((current - previous) / previous) * 100)
}

/** Per-sport weekly totals, used to check discipline balance. */
export function weeklyLoadBySport(
  activities: { activityDate: string; sport: Sport; tss: number | null }[],
  days = 7
): Partial<Record<Sport, number>> {
  const cutoff = daysAgo(days)
  const totals: Partial<Record<Sport, number>> = {}

  for (const activity of activities) {
    if (activity.activityDate < cutoff) continue
    const tss = activity.tss ?? 0
    totals[activity.sport] = round1((totals[activity.sport] ?? 0) + tss)
  }

  return totals
}

// ---------------------------------------------------------------------------
// Date helpers — all dates are local YYYY-MM-DD strings
// ---------------------------------------------------------------------------

export function eachDay(from: string, to: string): string[] {
  const days: string[] = []
  const current = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)

  // Guard against a malformed range producing an unbounded loop.
  let iterations = 0
  while (current <= end && iterations < 5000) {
    days.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
    iterations++
  }

  return days
}

export function daysAgo(days: number, from: Date = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() - days + 1)
  return date.toISOString().slice(0, 10)
}

/** The trailing N calendar days, filling untrained days with zero. */
function lastNDays(loads: DailyLoad[], days: number): DailyLoad[] {
  if (loads.length === 0) return []

  const byDate = new Map<string, number>()
  for (const load of loads) {
    byDate.set(load.date, (byDate.get(load.date) ?? 0) + load.tss)
  }

  const dates = [...byDate.keys()].sort()
  const lastDate = dates[dates.length - 1]
  if (!lastDate) return []

  const start = new Date(`${lastDate}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - days + 1)

  return eachDay(start.toISOString().slice(0, 10), lastDate).map((date) => ({
    date,
    tss: byDate.get(date) ?? 0,
  }))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
