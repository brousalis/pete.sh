/**
 * Resolve ride/run distance for gear mileage when HealthKit leaves
 * `distance_meters` null (common for indoor cycling and some watch exports).
 */

const METERS_PER_MILE = 1609.344

/** ~18 mph — indoor trainer sessions with HR/cadence only (no wheel sensor). */
export const INDOOR_CYCLING_ESTIMATE_MPH = 18

/** Outdoor ride with duration but no GPS distance on the workout row. */
export const OUTDOOR_CYCLING_FALLBACK_MPH = 16

export interface WorkoutDistanceRow {
  id?: string
  distance_meters: number | null
  distance_miles: number | null
  cycling_avg_speed: number | null
  duration: number | null
  is_indoor: boolean | null
  workout_type: string | null
}

export type GearDistanceSource =
  | 'workout_meters'
  | 'workout_miles'
  | 'route'
  | 'cycling_speed'
  | 'indoor_estimate'
  | 'outdoor_estimate'
  | 'none'

export interface ResolvedGearDistance {
  meters: number
  source: GearDistanceSource
}

export function resolveGearDistanceMeters(
  workout: WorkoutDistanceRow,
  routeTotalMeters: number | null | undefined
): ResolvedGearDistance {
  const fromWorkout = Number(workout.distance_meters)
  if (fromWorkout > 0) {
    return { meters: fromWorkout, source: 'workout_meters' }
  }

  const miles = Number(workout.distance_miles)
  if (miles > 0) {
    return { meters: miles * METERS_PER_MILE, source: 'workout_miles' }
  }

  const route = Number(routeTotalMeters)
  if (route > 0) {
    return { meters: route, source: 'route' }
  }

  const duration = Number(workout.duration)
  const speedMph = Number(workout.cycling_avg_speed)
  if (speedMph > 0 && duration > 0) {
    return {
      meters: mphDurationToMeters(speedMph, duration),
      source: 'cycling_speed',
    }
  }

  if (workout.workout_type === 'cycling' && duration > 0) {
    const mph = workout.is_indoor ? INDOOR_CYCLING_ESTIMATE_MPH : OUTDOOR_CYCLING_FALLBACK_MPH
    return {
      meters: mphDurationToMeters(mph, duration),
      source: workout.is_indoor ? 'indoor_estimate' : 'outdoor_estimate',
    }
  }

  return { meters: 0, source: 'none' }
}

function mphDurationToMeters(mph: number, durationSeconds: number): number {
  const miles = mph * (durationSeconds / 3600)
  return miles * METERS_PER_MILE
}
