/**
 * GET   /api/coach/watch/workouts — structured sessions for WorkoutKit
 * PATCH /api/coach/watch/workouts — report scheduling results back
 *
 * The iOS companion polls this, builds a WorkoutKit CustomWorkout for each
 * session, and schedules it into the Watch Workout app. That is what turns a
 * prescription into something executable on the wrist with the right alerts,
 * instead of a description the athlete has to remember mid-interval.
 *
 * WorkoutKit allows 15 scheduled workouts at a time, so a week of sessions
 * fits comfortably.
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { coachDb, getSessionsInRange } from '@/lib/services/coach/coach-data.service'
import { flattenWorkout, type SessionTargets } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** HealthKit activity type names the companion maps to HKWorkoutActivityType. */
const ACTIVITY_TYPES: Record<string, string> = {
  swim: 'swimming',
  bike: 'cycling',
  run: 'running',
  strength: 'functionalStrengthTraining',
  brick: 'cycling',
  walk: 'walking',
  hiit: 'highIntensityIntervalTraining',
  cross: 'other',
}

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const days = Math.min(14, Number(request.nextUrl.searchParams.get('days') ?? '7'))

    const to = new Date(`${today}T00:00:00Z`)
    to.setUTCDate(to.getUTCDate() + days)

    const sessions = await getSessionsInRange(today, to.toISOString().slice(0, 10))

    const schedulable = sessions
      .filter((session) => {
        if (session.status === 'cancelled' || session.status === 'completed') return false
        if (session.sport === 'rest' || session.sport === 'pt') return false
        // A session the guardrails blocked must not reach the watch, or the
        // athlete will start it from the wrist without seeing the reason.
        if (session.guardrailReport && !session.guardrailReport.passed) return false
        return true
      })
      // WorkoutKit's limit; nearest sessions matter most.
      .slice(0, 15)

    return successResponse({
      generatedAt: new Date().toISOString(),
      workouts: schedulable.map((session) => {
        const steps = session.steps as Parameters<typeof flattenWorkout>[0]
        const hasStructure = Boolean(steps?.blocks?.length || steps?.warmup)

        return {
          sessionId: session.id,
          date: session.sessionDate,
          activityType: ACTIVITY_TYPES[session.sport] ?? 'other',
          location:
            session.sport === 'swim'
              ? 'pool'
              : session.sport === 'strength'
                ? 'indoor'
                : 'outdoor',
          displayName: session.title,
          // Pool length matters: the watch counts lengths against it.
          poolLengthMeters: session.sport === 'swim' ? 22.86 : null,
          // A session without structured steps becomes a single open goal
          // rather than being skipped, so it still appears on the watch.
          steps: hasStructure
            ? flattenWorkout(steps)
            : [
                {
                  kind: 'work',
                  label: session.title,
                  goal: session.plannedDurationSeconds
                    ? { type: 'time', value: session.plannedDurationSeconds, unit: 'seconds' }
                    : { type: 'open' },
                  alert: buildAlertFromTargets(session.targets),
                },
              ],
          syncState: session.watchSyncState,
        }
      }),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      results?: { sessionId: string; state: 'scheduled' | 'unsupported' | 'failed' }[]
    }

    if (!body.results?.length) {
      return errorResponse('No results supplied.', 400)
    }

    const db = coachDb()
    const now = new Date().toISOString()

    for (const result of body.results) {
      await db
        .from('coach_planned_session')
        .update({
          watch_sync_state: result.state,
          watch_synced_at: result.state === 'scheduled' ? now : null,
        })
        .eq('id', result.sessionId)
    }

    return successResponse({ updated: body.results.length })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Turn session targets into a WorkoutKit alert.
 *
 * Cadence wins for cycling: low cadence means high pedal force, which is the
 * mechanism that aggravated the knee, so it is the alert worth surfacing
 * mid-ride.
 */
function buildAlertFromTargets(targets: SessionTargets): unknown {
  if (!targets) return null

  const cadence = targets.cadenceRange as [number, number] | undefined
  if (cadence) return { type: 'cadence', min: cadence[0], max: cadence[1] }

  const hrRange = targets.hrRange as [number, number] | undefined
  if (hrRange) return { type: 'heartRate', min: hrRange[0], max: hrRange[1] }

  if (targets.hrZone) return { type: 'heartRate', zone: targets.hrZone }

  return null
}
