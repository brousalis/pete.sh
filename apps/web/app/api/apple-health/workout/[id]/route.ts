/**
 * Apple Health Workout Detail API
 * GET - Get a specific workout with all samples and enhanced analytics
 */

import { appleHealthService } from '@/lib/services/apple-health.service'
import { computeEnhancedAnalytics } from '@/lib/utils/workout-analytics'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Supabase client for HR zones query
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface HrZonesConfig {
  id: string
  max_hr: number | null
  resting_hr: number | null
  // Direct BPM thresholds from Apple Watch
  zone1_max_bpm: number
  zone2_min_bpm: number
  zone2_max_bpm: number
  zone3_min_bpm: number
  zone3_max_bpm: number
  zone4_min_bpm: number
  zone4_max_bpm: number
  zone5_min_bpm: number
  // Labels and colors
  zone1_label: string
  zone2_label: string
  zone3_label: string
  zone4_label: string
  zone5_label: string
  zone1_color: string
  zone2_color: string
  zone3_color: string
  zone4_color: string
  zone5_color: string
}

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

    // Fetch user's HR zones config (get the active one where effective_to is null)
    let hrZonesConfig: HrZonesConfig | null = null

    const { data: zonesData, error: zonesError } = await supabase
      .from('user_hr_zones_config')
      .select('*')
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (zonesError) {
      console.error('Error fetching HR zones config:', zonesError)
    }

    if (zonesData) {
      hrZonesConfig = zonesData as HrZonesConfig
      console.log('Loaded HR zones config:', hrZonesConfig.id)
    } else {
      console.log('No HR zones config found')
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

      // Use HR zones config if available, otherwise defaults
      const restingHr = hrZonesConfig?.resting_hr || 55
      const maxHr = hrZonesConfig?.max_hr || 185

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
          restingHr,
          maxHr,
          cyclingSpeedSamples: cyclingSpeedSamplesForAnalytics,
          cyclingPowerSamples: cyclingPowerSamplesForAnalytics
        }
      )

      // Inject elevation data from route into splits (if route and splits exist)
      if (enhancedAnalytics && enhancedAnalytics.splits.length > 0 && result.route?.samples?.length) {
        const routeSamples = result.route.samples as Array<{ altitude?: number; latitude: number; longitude: number }>
        const altSamples = routeSamples.filter(s => s.altitude != null)
        if (altSamples.length > 0) {
          const numSplits = enhancedAnalytics.splits.length
          const samplesPerSplit = Math.floor(altSamples.length / numSplits)
          for (let i = 0; i < numSplits; i++) {
            const split = enhancedAnalytics.splits[i]
            if (!split) continue
            const startIdx = i * samplesPerSplit
            const endIdx = i === numSplits - 1 ? altSamples.length - 1 : (i + 1) * samplesPerSplit
            const startAlt = altSamples[startIdx]?.altitude ?? 0
            const endAlt = altSamples[endIdx]?.altitude ?? 0
            split.elevationChange = endAlt - startAlt
          }
        }
      }
    }

    // Derive GPS-based pace time-series from route speed data (far more granular than HealthKit pace)
    let gpsPaceData: Array<{ elapsedSeconds: number; pace: number; speed: number }> | null = null
    if (result.route?.samples?.length && result.route.samples.length >= 2) {
      const routeSamples = result.route.samples as Array<{
        timestamp: string; speed?: number; altitude?: number;
        latitude: number; longitude: number
      }>
      const workoutStartMs = new Date(result.workout.start_date).getTime()
      const duration = result.workout.duration

      // Build raw pace data from GPS speed at each point
      const rawGps: Array<{ elapsed: number; speed: number }> = []
      for (const sample of routeSamples) {
        if (sample.speed == null || sample.speed < 0.3) continue // filter standing still
        if (sample.speed > 6.5) continue // filter unreasonable speeds (> ~14.5 mph)
        const elapsed = (new Date(sample.timestamp).getTime() - workoutStartMs) / 1000
        if (elapsed < 0 || elapsed > duration + 30) continue
        rawGps.push({ elapsed, speed: sample.speed })
      }

      if (rawGps.length >= 10) {
        // Sort by elapsed time
        rawGps.sort((a, b) => a.elapsed - b.elapsed)

        // Smooth with rolling average (window of ~5 seconds)
        const smoothed: typeof rawGps = []
        const windowSize = 5
        for (let i = 0; i < rawGps.length; i++) {
          const start = Math.max(0, i - Math.floor(windowSize / 2))
          const end = Math.min(rawGps.length, i + Math.ceil(windowSize / 2))
          let sumSpeed = 0
          for (let j = start; j < end; j++) sumSpeed += rawGps[j]!.speed
          smoothed.push({ elapsed: rawGps[i]!.elapsed, speed: sumSpeed / (end - start) })
        }

        // Downsample to 15-second grid (aligned with time-series data)
        const interval = 15
        const buckets = new Map<number, { total: number; count: number }>()
        for (const pt of smoothed) {
          const bucket = Math.round(pt.elapsed / interval) * interval
          const existing = buckets.get(bucket)
          if (existing) {
            existing.total += pt.speed
            existing.count++
          } else {
            buckets.set(bucket, { total: pt.speed, count: 1 })
          }
        }

        gpsPaceData = []
        for (const [elapsed, { total, count }] of buckets.entries()) {
          const avgSpeed = total / count
          const pace = 26.8224 / avgSpeed // Convert m/s to min/mi
          if (pace >= 4 && pace <= 25) { // reasonable pace range
            gpsPaceData.push({ elapsedSeconds: elapsed, pace: Math.round(pace * 100) / 100, speed: Math.round(avgSpeed * 100) / 100 })
          }
        }
        gpsPaceData.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)

        if (gpsPaceData.length < 5) gpsPaceData = null // not enough data points
      }
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
        // Route/GPS data (for outdoor workouts)
        route: result.route,
        // GPS-derived pace time-series (more granular than HealthKit pace for outdoor runs)
        gpsPaceData,
        // Analytics
        analytics: enhancedAnalytics,
        // User's HR zones config (for zone-colored charts)
        // Direct BPM thresholds from Apple Watch HealthKit
        hrZonesConfig: hrZonesConfig ? {
          maxHr: hrZonesConfig.max_hr,
          restingHr: hrZonesConfig.resting_hr,
          zones: [
            { zone: 1, label: hrZonesConfig.zone1_label, minBpm: 0, maxBpm: hrZonesConfig.zone1_max_bpm, color: hrZonesConfig.zone1_color },
            { zone: 2, label: hrZonesConfig.zone2_label, minBpm: hrZonesConfig.zone2_min_bpm, maxBpm: hrZonesConfig.zone2_max_bpm, color: hrZonesConfig.zone2_color },
            { zone: 3, label: hrZonesConfig.zone3_label, minBpm: hrZonesConfig.zone3_min_bpm, maxBpm: hrZonesConfig.zone3_max_bpm, color: hrZonesConfig.zone3_color },
            { zone: 4, label: hrZonesConfig.zone4_label, minBpm: hrZonesConfig.zone4_min_bpm, maxBpm: hrZonesConfig.zone4_max_bpm, color: hrZonesConfig.zone4_color },
            { zone: 5, label: hrZonesConfig.zone5_label, minBpm: hrZonesConfig.zone5_min_bpm, maxBpm: 999, color: hrZonesConfig.zone5_color },
          ]
        } : null,
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
