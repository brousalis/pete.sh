/**
 * Apple Health Workout Detail API
 * GET - Get a specific workout with all samples and enhanced analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { computeEnhancedAnalytics } from '@/lib/utils/workout-analytics'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/apple-health/workout/[id]
 * Get a single workout with HR, cadence, and pace samples plus enhanced analytics
 * Query params:
 *   - samples: Include full samples (default true)
 *   - downsample: Downsample interval for HR chart (default 30 seconds)
 *   - analytics: Include enhanced analytics (default true for running workouts)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeSamples = searchParams.get('samples') !== 'false'
    const includeAnalytics = searchParams.get('analytics') !== 'false'
    const downsampleInterval = parseInt(searchParams.get('downsample') || '30', 10)

    if (!includeSamples) {
      // Just get basic workout data without samples
      const workouts = await appleHealthService.getRecentWorkouts(undefined, 100)
      const workout = workouts.find(w => w.id === id)
      
      if (!workout) {
        return NextResponse.json(
          { success: false, error: 'Workout not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { workout },
      })
    }

    // Get full workout with samples
    const result = await appleHealthService.getWorkout(id)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Workout not found' },
        { status: 404 }
      )
    }

    // Optionally downsample HR for chart display
    let hrChart = result.hrSamples
    if (downsampleInterval > 0 && result.hrSamples.length > 100) {
      const interval = Math.ceil(downsampleInterval / 5)
      hrChart = result.hrSamples.filter((_, i) => i % interval === 0)
    }

    // Compute enhanced analytics for running/cardio workouts
    let enhancedAnalytics = null
    const isCardioWorkout = ['running', 'walking', 'cycling', 'rowing', 'elliptical', 'stairClimbing'].includes(result.workout.workout_type)
    
    if (includeAnalytics && isCardioWorkout) {
      // Transform samples to analytics format
      const hrSamplesForAnalytics = result.hrSamples.map(s => ({
        timestamp: s.timestamp,
        bpm: s.bpm
      }))
      
      const cadenceSamplesForAnalytics = result.cadenceSamples.map(s => ({
        timestamp: s.timestamp,
        steps_per_minute: s.steps_per_minute
      }))
      
      const paceSamplesForAnalytics = result.paceSamples.map(s => ({
        timestamp: s.timestamp,
        minutes_per_mile: s.minutes_per_mile
      }))

      // Transform cycling samples for analytics
      const cyclingSpeedSamplesForAnalytics = result.cyclingSpeedSamples.map(s => ({
        timestamp: s.timestamp,
        speed_mph: s.speed_mph
      }))
      
      const cyclingPowerSamplesForAnalytics = result.cyclingPowerSamples.map(s => ({
        timestamp: s.timestamp,
        watts: s.watts
      }))

      enhancedAnalytics = computeEnhancedAnalytics(
        {
          start_date: result.workout.start_date,
          end_date: result.workout.end_date,
          duration: result.workout.duration,
          distance_miles: result.workout.distance_miles,
          hr_average: result.workout.hr_average,
          hr_min: result.workout.hr_min,
          hr_max: result.workout.hr_max,
          hr_zones: result.workout.hr_zones,
          cadence_average: result.workout.cadence_average,
          pace_average: result.workout.pace_average,
          pace_best: result.workout.pace_best
        },
        hrSamplesForAnalytics,
        cadenceSamplesForAnalytics,
        paceSamplesForAnalytics,
        {
          // These could come from user settings or daily metrics
          restingHr: 55, // Could fetch from daily metrics
          maxHr: 185,    // Could be user-configured
          // Include cycling data
          cyclingSpeedSamples: cyclingSpeedSamplesForAnalytics,
          cyclingPowerSamples: cyclingPowerSamplesForAnalytics
        }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        workout: result.workout,
        hrSamples: result.hrSamples,
        hrChart, // Downsampled for charts
        cadenceSamples: result.cadenceSamples,
        paceSamples: result.paceSamples,
        // Cycling data
        cyclingSpeedSamples: result.cyclingSpeedSamples,
        cyclingCadenceSamples: result.cyclingCadenceSamples,
        cyclingPowerSamples: result.cyclingPowerSamples,
        // Events and splits
        workoutEvents: result.workoutEvents,
        splits: result.splits,
        // Analytics
        analytics: enhancedAnalytics,
      },
    })
  } catch (error) {
    console.error('Error fetching workout:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
