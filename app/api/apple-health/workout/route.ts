/**
 * Apple Health Workout API
 * POST - Save a workout from PeteWatch
 * GET - Get recent workouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'
import type { AppleHealthWorkoutPayload } from '@/lib/types/apple-health.types'

// API Key for PeteWatch authentication
const PETEWATCH_API_KEY = process.env.PETEWATCH_API_KEY

/**
 * Verify PeteWatch API key
 */
function verifyApiKey(request: NextRequest): boolean {
  // In development, allow without key
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === PETEWATCH_API_KEY
}

/**
 * POST /api/apple-health/workout
 * Save a workout from Apple Watch
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload: AppleHealthWorkoutPayload = await request.json()

    // Validate required fields
    if (!payload.workout || !payload.workout.id || !payload.workout.workoutType) {
      return NextResponse.json(
        { success: false, error: 'Missing required workout fields' },
        { status: 400 }
      )
    }

    const result = await appleHealthService.saveWorkout(payload)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error saving workout:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/apple-health/workout
 * Get recent workouts
 * Query params:
 *   - type: Filter by workout type (e.g., 'running', 'functionalStrengthTraining')
 *   - limit: Number of workouts to return (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workoutType = searchParams.get('type') || undefined
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const workouts = await appleHealthService.getRecentWorkouts(workoutType, limit)

    return NextResponse.json({
      success: true,
      data: workouts,
    })
  } catch (error) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
