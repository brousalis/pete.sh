/**
 * GET /api/coach/activities — Activity dashboard payload
 *
 * Composes apple-health workouts/daily/summary with coach_activity_v enrichment
 * (TSS, sport, planned session link) for the Activity desk panel.
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { queryActivities } from '@/lib/services/coach/coach-data.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get('limit') ?? '50') || 50, 200)
    const days = Math.min(Number(searchParams.get('days') ?? '90') || 90, 180)
    const weeks = Math.min(Number(searchParams.get('weeks') ?? '4') || 4, 12)

    // Backfill SCY distance/laps for swims that only have HealthKit lap events.
    await appleHealthService.enrichSwimMetricsFromLaps()

    const [workouts, coachActivities, dailyMetrics, weeklySummary] = await Promise.all([
      appleHealthService.getRecentWorkouts(undefined, limit),
      queryActivities({ limit }),
      appleHealthService.getDailyMetrics(days),
      appleHealthService.getWeeklySummary(weeks),
    ])

    const coachById = new Map(coachActivities.map((a) => [a.id, a]))

    const enrichedWorkouts = workouts.map((workout) => {
      const coach = coachById.get(workout.id)
      return {
        id: workout.id,
        healthkit_id: workout.healthkit_id,
        workout_type: workout.workout_type,
        start_date: workout.start_date,
        end_date: workout.end_date,
        duration: workout.duration,
        active_calories: workout.active_calories,
        total_calories: workout.total_calories,
        distance_meters: workout.distance_meters,
        distance_miles: workout.distance_miles,
        elevation_gain_meters: workout.elevation_gain_meters,
        hr_average: workout.hr_average,
        hr_min: workout.hr_min,
        hr_max: workout.hr_max,
        hr_zones: workout.hr_zones,
        cadence_average: workout.cadence_average,
        pace_average: workout.pace_average,
        pace_best: workout.pace_best,
        stride_length_avg: workout.stride_length_avg,
        running_power_avg: workout.running_power_avg,
        ground_contact_time_avg: workout.ground_contact_time_avg,
        vertical_oscillation_avg: workout.vertical_oscillation_avg,
        cycling_avg_speed: workout.cycling_avg_speed,
        cycling_max_speed: workout.cycling_max_speed,
        cycling_avg_cadence: workout.cycling_avg_cadence,
        cycling_avg_power: workout.cycling_avg_power,
        cycling_max_power: workout.cycling_max_power,
        effort_score: workout.effort_score,
        is_indoor: workout.is_indoor,
        source: workout.source,
        swimming_stroke_count: workout.swimming_stroke_count,
        swimming_pool_length_meters: workout.swimming_pool_length_meters,
        swimming_location: workout.swimming_location,
        swimming_lap_count: workout.swimming_lap_count,
        swimming_avg_swolf: workout.swimming_avg_swolf,
        swimming_avg_pace_per_100: workout.swimming_avg_pace_per_100,
        sport: coach?.sport ?? null,
        tss: coach?.tss ?? null,
        tss_method: coach?.tssMethod ?? null,
        planned_session_id: coach?.plannedSessionId ?? null,
      }
    })

    const mostRecentSync =
      dailyMetrics.length > 0
        ? dailyMetrics.reduce((latest, current) =>
            new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
          )
        : null

    return successResponse({
      workouts: enrichedWorkouts,
      dailyMetrics,
      weeklySummary,
      syncMetadata: mostRecentSync
        ? {
            lastSyncTimestamp: mostRecentSync.recorded_at,
            totalDays: dailyMetrics.length,
            dateRange: {
              start: dailyMetrics[dailyMetrics.length - 1]?.date,
              end: dailyMetrics[0]?.date,
            },
          }
        : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
