/**
 * GET /api/coach/watch/today — compact payload for the PeteTrain watch app
 *
 * Replaces the watch's `workout-definitions?routineId=climber-physique` call.
 * Deliberately small: the watch is often on cellular with a weak signal, and
 * the previous implementation aborted the whole sync when a request failed.
 *
 * Authenticated with the coach bearer key rather than a session cookie.
 */

import { NextRequest } from 'next/server'

import type { SessionTargets } from '@petehome/coach-core'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { computeAndStoreReadiness } from '@/lib/services/coach/analytics.service'
import {
  coachDb,
  getPtProtocols,
  getSessionsInRange,
} from '@/lib/services/coach/coach-data.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const date =
      request.nextUrl.searchParams.get('date') ??
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    const [sessions, protocols] = await Promise.all([
      getSessionsInRange(date, date),
      getPtProtocols(),
    ])

    // Readiness is nice to have on the watch face but must not block the
    // payload; the watch needs today's sessions above all.
    const readiness = await computeAndStoreReadiness(date).catch(() => null)

    const { data: completions } = await coachDb()
      .from('coach_pt_completion')
      .select('protocol_id, skipped')
      .eq('completed_date', date)

    const completedIds = new Set(
      ((completions ?? []) as { protocol_id: string; skipped: boolean }[])
        .filter((row) => !row.skipped)
        .map((row) => row.protocol_id)
    )

    const hasRun = sessions.some((session) => session.sport === 'run')

    return successResponse({
      date,
      readiness: readiness
        ? { score: readiness.score, level: readiness.level, blocked: readiness.score < 38 }
        : null,
      sessions: sessions
        .filter((session) => session.status !== 'cancelled')
        .map((session) => ({
          id: session.id,
          sport: session.sport,
          type: session.sessionType,
          title: session.title,
          durationMinutes: session.plannedDurationSeconds
            ? Math.round(session.plannedDurationSeconds / 60)
            : null,
          distanceMeters: session.plannedDistanceMeters,
          // The watch shows a single target line rather than the full step
          // tree; the structured version reaches it through WorkoutKit.
          target: summariseTarget(session.targets),
          completed: session.status === 'completed',
          // A blocked session is shown greyed out with the reason, rather
          // than hidden, so the athlete knows why it is not there.
          blocked: session.guardrailReport ? !session.guardrailReport.passed : false,
          blockedReason:
            session.guardrailReport?.violations.find(
              (violation) => violation.severity === 'block' || violation.severity === 'red_flag'
            )?.message ?? null,
        })),
      ptBlocks: protocols
        .filter((protocol) => {
          if (protocol.cadence === 'run_days') return hasRun
          if (protocol.cadence === 'training_days') return sessions.length > 0
          return true
        })
        .map((protocol) => ({
          id: protocol.id,
          name: protocol.name,
          timeOfDay: protocol.timeOfDay,
          completed: completedIds.has(protocol.id),
          exercises: protocol.items.map((item) => ({
            name: item.name,
            prescription: formatPrescription(item.prescription),
          })),
        })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

function summariseTarget(targets: SessionTargets): string | null {
  if (!targets) return null

  const parts: string[] = []
  if (targets.hrZone) parts.push(`Z${targets.hrZone}`)

  const hrRange = targets.hrRange as [number, number] | undefined
  if (hrRange) parts.push(`${hrRange[0]}-${hrRange[1]} bpm`)

  const cadence = targets.cadenceRange as [number, number] | undefined
  if (cadence) parts.push(`${cadence[0]}+ rpm`)

  if (targets.rpe) parts.push(`RPE ${targets.rpe}`)

  return parts.length ? parts.join(' · ') : null
}

function formatPrescription(prescription: Record<string, unknown>): string {
  const parts: string[] = []

  if (prescription.sets) parts.push(`${prescription.sets}x`)
  if (prescription.reps) parts.push(`${prescription.reps}`)
  if (prescription.hold_seconds) parts.push(`${prescription.hold_seconds}s`)
  if (prescription.side === 'each') parts.push('ea')

  return parts.join(' ') || '—'
}
