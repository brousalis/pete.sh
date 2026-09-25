/**
 * Chicago-local calendar helpers for coach UI.
 * Plan, Fuel, and related surfaces treat "today" as America/Chicago.
 */

export function chicagoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export function shiftChicagoDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d! + deltaDays))
  return utc.toISOString().slice(0, 10)
}

/** Monday (ISO week) of the week containing `date` (YYYY-MM-DD). */
export function chicagoMondayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d!))
  // getUTCDay: 0=Sun … 6=Sat. Shift so Monday=0.
  const day = utc.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  utc.setUTCDate(utc.getUTCDate() + diff)
  return utc.toISOString().slice(0, 10)
}

/**
 * Week offset from this week's Monday (Chicago) to the Monday of `date`.
 * Positive = future weeks, negative = past.
 */
export function weekOffsetFromToday(date: string): number {
  const thisMonday = chicagoMondayOf(chicagoToday())
  const targetMonday = chicagoMondayOf(date)
  const thisMs = Date.parse(`${thisMonday}T00:00:00Z`)
  const targetMs = Date.parse(`${targetMonday}T00:00:00Z`)
  return Math.round((targetMs - thisMs) / (7 * 24 * 60 * 60 * 1000))
}

/**
 * Align a week offset to Plan's ±4-week pager windows
 * so jumping to a day keeps the existing chevron paging coherent.
 */
export function alignedWeekOffset(date: string): number {
  const weeks = weekOffsetFromToday(date)
  return Math.floor(weeks / 4) * 4
}

/** First day of the calendar month containing `date`. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

/** Last day of the calendar month containing `date`. */
export function monthEnd(date: string): string {
  const [y, m] = date.split('-').map(Number)
  const last = new Date(Date.UTC(y!, m!, 0))
  return last.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return shiftChicagoDate(date, days)
}

export function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d!))
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() === m! - 1 &&
    utc.getUTCDate() === d
  )
}
