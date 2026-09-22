/**
 * Enrich planned sessions with linked HealthKit workout glances for Today / Plan.
 */

import type { PlannedSession } from '@petehome/coach-core'

import { appleHealthService } from '@/lib/services/apple-health.service'
import { getActivitiesByIds } from '@/lib/services/coach/coach-data.service'
import type { SessionActivityGlance, TodaySession } from '@/lib/types/coach-ui.types'

export async function loadActivityGlancesByIds(
  activityIds: string[]
): Promise<Map<string, SessionActivityGlance>> {
  const unique = [...new Set(activityIds.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const [workouts, coachActivities] = await Promise.all([
    appleHealthService.getWorkoutsByIds(unique),
    getActivitiesByIds(unique),
  ])

  const coachById = new Map(coachActivities.map((a) => [a.id, a]))
  const result = new Map<string, SessionActivityGlance>()

  for (const workout of workouts) {
    const coach = coachById.get(workout.id)
    result.set(workout.id, {
      id: workout.id,
      workoutType: workout.workout_type,
      durationSeconds: workout.duration,
      distanceMeters: workout.distance_meters,
      tss: coach?.tss ?? null,
      hrAverage: workout.hr_average,
      hrZones: workout.hr_zones,
      zoneSeconds: coach?.zoneSeconds ?? null,
      paceAverage: workout.pace_average,
      cadenceAverage: workout.cadence_average,
      cyclingAvgPower: workout.cycling_avg_power,
      cyclingAvgSpeed: workout.cycling_avg_speed,
      swimPacePer100: workout.swimming_avg_pace_per_100,
      swimSwolf: workout.swimming_avg_swolf,
      swimLapCount: workout.swimming_lap_count,
      activeCalories: workout.active_calories,
      effortScore: workout.effort_score,
      elevationGainMeters: workout.elevation_gain_meters,
      isIndoor: workout.is_indoor,
    })
  }

  return result
}

export function mapPlannedSessionToToday(
  session: PlannedSession,
  activity: SessionActivityGlance | null = null
): TodaySession {
  return {
    id: session.id,
    sessionDate: session.sessionDate,
    slot: session.slot,
    sport: session.sport,
    type: session.sessionType,
    title: session.title,
    description: session.description,
    durationMinutes: session.plannedDurationSeconds
      ? Math.round(session.plannedDurationSeconds / 60)
      : null,
    distanceMeters: session.plannedDistanceMeters,
    plannedLoad: session.plannedLoad,
    steps: session.steps as Record<string, unknown>,
    targets: session.targets,
    rationale: session.rationale,
    status: session.status,
    guardrail: session.guardrailReport
      ? {
          passed: session.guardrailReport.passed,
          severity: session.guardrailReport.severity,
          violations: session.guardrailReport.violations.map((violation) => ({
            severity: violation.severity,
            message: violation.message,
            remedy: violation.remedy,
          })),
        }
      : null,
    activity,
  }
}

export async function enrichSessionsWithActivity(
  sessions: PlannedSession[]
): Promise<TodaySession[]> {
  const ids = sessions
    .map((session) => session.completedActivityId)
    .filter((id): id is string => Boolean(id))

  const glances = await loadActivityGlancesByIds(ids)

  return sessions.map((session) => {
    const activity =
      session.completedActivityId != null
        ? glances.get(session.completedActivityId) ?? null
        : null
    return mapPlannedSessionToToday(session, activity)
  })
}
