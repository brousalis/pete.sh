/**
 * Exercise Weight Log API
 * POST - Log exercise weights/reps/RPE after workout completion
 * GET - Get exercise weight history for progressive overload tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { exerciseWeightLogService } from '@/lib/services/exercise-weight-log.service'
import type { ExerciseWeightLog } from '@/lib/types/fitness.types'

/**
 * POST /api/fitness/exercise-weights
 * Log exercise weight/reps for one or more exercises
 * Body: { logs: ExerciseWeightLog[] } or single ExerciseWeightLog
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.logs && Array.isArray(body.logs)) {
      const success = await exerciseWeightLogService.logExercises(
        body.logs as ExerciseWeightLog[]
      )
      return NextResponse.json({
        success,
        message: success
          ? `Logged ${body.logs.length} exercise(s)`
          : 'Failed to log exercises',
      })
    }

    const log = body as ExerciseWeightLog
    if (!log.exerciseId || !log.exerciseName || !log.dayOfWeek) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: exerciseId, exerciseName, dayOfWeek' },
        { status: 400 }
      )
    }

    const success = await exerciseWeightLogService.logExercise(log)
    return NextResponse.json({
      success,
      message: success ? 'Exercise logged' : 'Failed to log exercise',
    })
  } catch (error) {
    console.error('Error logging exercise weights:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/fitness/exercise-weights
 * Query params:
 *   - exerciseId: Get history for specific exercise
 *   - exerciseName: Get history by name (fuzzy match)
 *   - weeks: Number of weeks to look back (default 8)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exerciseId = searchParams.get('exerciseId')
    const exerciseName = searchParams.get('exerciseName')
    const weeksBack = parseInt(searchParams.get('weeks') || '8', 10)

    if (exerciseId) {
      const logs = await exerciseWeightLogService.getExerciseHistory(exerciseId, weeksBack)
      return NextResponse.json({ success: true, data: logs })
    }

    if (exerciseName) {
      const logs = await exerciseWeightLogService.getExerciseHistoryByName(exerciseName, weeksBack)
      return NextResponse.json({ success: true, data: logs })
    }

    const logs = await exerciseWeightLogService.getRecentLogs(weeksBack)
    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Error fetching exercise weight logs:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
