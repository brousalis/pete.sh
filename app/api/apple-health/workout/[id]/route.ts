/**
 * Apple Health Workout Detail API
 * GET - Get a specific workout with all samples
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/apple-health/workout/[id]
 * Get a single workout with HR, cadence, and pace samples
 * Query params:
 *   - samples: Include full samples (default true)
 *   - downsample: Downsample interval for HR chart (default 30 seconds)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeSamples = searchParams.get('samples') !== 'false'
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

    return NextResponse.json({
      success: true,
      data: {
        workout: result.workout,
        hrSamples: result.hrSamples,
        hrChart, // Downsampled for charts
        cadenceSamples: result.cadenceSamples,
        paceSamples: result.paceSamples,
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
