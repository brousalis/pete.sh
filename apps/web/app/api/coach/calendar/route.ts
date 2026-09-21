/**
 * GET /api/coach/calendar — the training plan as an ICS feed
 *
 * Subscribing in Apple Calendar puts sessions next to meetings, which is the
 * only reliable way to notice that Thursday's tempo run collides with a 6pm
 * call before the day arrives.
 *
 * Authenticated with the coach key as a query parameter, because calendar
 * clients cannot send an Authorization header on a subscription URL.
 */

import { NextRequest } from 'next/server'

import { getSessionsInRange } from '@/lib/services/coach/coach-data.service'
import { SPORT_LABELS } from '@/lib/types/coach-ui.types'
import type { SessionTargets } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Typical start times per sport, so events land at a plausible hour. */
const DEFAULT_START_HOUR: Record<string, number> = {
  swim: 6,
  bike: 17,
  run: 6,
  strength: 17,
  brick: 8,
  pt: 6,
}

export async function GET(request: NextRequest) {
  // The proxy gate accepts a bearer header; calendar clients cannot send one,
  // so a key query parameter is accepted here specifically.
  const key = request.nextUrl.searchParams.get('key')
  const expected = process.env.COACH_API_KEY

  if (!expected || key !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const from = addDays(today, -30)
  const to = addDays(today, 120)

  const sessions = await getSessionsInRange(from, to)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//pete.sh//petehome//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:petehome Training',
    'X-WR-TIMEZONE:America/Chicago',
    // Clients refresh a subscription roughly this often.
    'X-PUBLISHED-TTL:PT2H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT2H',
  ]

  for (const session of sessions) {
    if (session.status === 'cancelled') continue

    const hour = DEFAULT_START_HOUR[session.sport] ?? 7
    const durationMinutes = session.plannedDurationSeconds
      ? Math.round(session.plannedDurationSeconds / 60)
      : 60

    const start = `${session.sessionDate.replace(/-/g, '')}T${String(hour).padStart(2, '0')}0000`
    const endDate = new Date(`${session.sessionDate}T${String(hour).padStart(2, '0')}:00:00`)
    endDate.setMinutes(endDate.getMinutes() + durationMinutes)
    const end = formatLocal(endDate)

    const summary = `${SPORT_LABELS[session.sport] ?? session.sport}: ${session.title}`

    const descriptionParts = [
      session.description,
      session.rationale ? `Why: ${session.rationale}` : null,
      session.plannedLoad ? `Planned load: ${session.plannedLoad} TSS` : null,
      formatTargets(session.targets),
      session.guardrailReport && !session.guardrailReport.passed
        ? `BLOCKED: ${session.guardrailReport.violations.find((v) => v.severity === 'block' || v.severity === 'red_flag')?.message ?? 'see the app'}`
        : null,
    ].filter(Boolean)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${session.id}@pete.sh`,
      `DTSTAMP:${formatUtc(new Date())}`,
      `DTSTART;TZID=America/Chicago:${start}`,
      `DTEND;TZID=America/Chicago:${end}`,
      `SUMMARY:${escapeIcs(summary)}`,
      descriptionParts.length
        ? `DESCRIPTION:${escapeIcs(descriptionParts.join('\\n'))}`
        : 'DESCRIPTION:',
      `STATUS:${session.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')

  // ICS requires CRLF line endings; some clients reject LF-only files.
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="petehome.ics"',
      'Cache-Control': 'no-store',
    },
  })
}

function formatTargets(targets: SessionTargets): string | null {
  if (!targets) return null

  const parts: string[] = []
  if (targets.hrZone) parts.push(`Zone ${targets.hrZone}`)

  const cadence = targets.cadenceRange as [number, number] | undefined
  if (cadence) parts.push(`cadence ${cadence[0]}+ rpm`)

  if (targets.rpe) parts.push(`RPE ${targets.rpe}`)

  return parts.length ? `Targets: ${parts.join(', ')}` : null
}

function formatLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

function formatUtc(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/** Escape per RFC 5545: backslash, semicolon, comma and newline. */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
