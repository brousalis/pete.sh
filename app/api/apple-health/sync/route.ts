/**
 * Apple Health Batch Sync API
 * POST - Batch sync multiple workouts and daily metrics from PeteWatch
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { verifyPeteWatchAuth } from '@/lib/api/petewatch-auth'
import type { AppleHealthBatchSyncPayload } from '@/lib/types/apple-health.types'

/**
 * POST /api/apple-health/sync
 * Batch sync workouts and daily metrics from Apple Watch
 * This is the main endpoint PeteWatch should call for background sync
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyPeteWatchAuth(request)
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload: AppleHealthBatchSyncPayload = await request.json()
    
    const results = {
      workoutsSaved: 0,
      workoutsFailed: 0,
      dailyMetricsSaved: 0,
      dailyMetricsFailed: 0,
      errors: [] as string[],
    }

    // Sync workouts
    if (payload.workouts && payload.workouts.length > 0) {
      for (const workout of payload.workouts) {
        try {
          await appleHealthService.saveWorkout({ workout })
          results.workoutsSaved++
        } catch (error) {
          results.workoutsFailed++
          results.errors.push(`Workout ${workout.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // Sync daily metrics
    if (payload.dailyMetrics && payload.dailyMetrics.length > 0) {
      for (const metrics of payload.dailyMetrics) {
        try {
          const success = await appleHealthService.saveDailyMetrics(metrics)
          if (success) {
            results.dailyMetricsSaved++
          } else {
            results.dailyMetricsFailed++
          }
        } catch (error) {
          results.dailyMetricsFailed++
          results.errors.push(`Daily metrics ${metrics.date}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    const success = results.workoutsFailed === 0 && results.dailyMetricsFailed === 0

    return NextResponse.json({
      success,
      data: results,
      syncTimestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error during batch sync:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
