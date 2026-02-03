/**
 * Fitness Backfill API
 * POST - Backfill historical HealthKit workouts to link with fitness routines
 *
 * This is an administrative endpoint for one-time backfill operations.
 */

import { workoutAutocompleteService } from '@/lib/services/workout-autocomplete.service'
import { NextRequest, NextResponse } from 'next/server'

interface BackfillRequest {
  startDate?: string  // ISO date string
  endDate?: string    // ISO date string
  dryRun?: boolean    // If true, don't make changes
}

/**
 * POST /api/fitness/backfill
 * Backfill historical HealthKit workouts to create exercise links
 *
 * Body:
 *   - startDate?: ISO date string (defaults to all time)
 *   - endDate?: ISO date string (defaults to now)
 *   - dryRun?: boolean (if true, just preview what would happen)
 */
export async function POST(request: NextRequest) {
  try {
    const body: BackfillRequest = await request.json().catch(() => ({}))

    console.log('[Backfill API] Starting backfill with options:', {
      startDate: body.startDate || 'all time',
      endDate: body.endDate || 'now',
      dryRun: body.dryRun || false,
    })

    const result = await workoutAutocompleteService.backfillHistoricalWorkouts({
      startDate: body.startDate,
      endDate: body.endDate,
      dryRun: body.dryRun,
    })

    return NextResponse.json({
      success: result.success,
      data: {
        summary: {
          totalWorkouts: result.totalWorkouts,
          processedWorkouts: result.processedWorkouts,
          skippedWorkouts: result.skippedWorkouts,
          exercisesCompleted: result.exercisesCompleted,
          dryRun: body.dryRun || false,
        },
        errors: result.errors,
        // Only include details if there aren't too many
        details: result.details.length <= 100 ? result.details : undefined,
        detailsNote: result.details.length > 100
          ? `${result.details.length} workout details omitted (too many to display)`
          : undefined,
      },
    })
  } catch (error) {
    console.error('[Backfill API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/fitness/backfill
 * Get backfill status / preview without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Always dry run for GET requests
    const result = await workoutAutocompleteService.backfillHistoricalWorkouts({
      startDate,
      endDate,
      dryRun: true,
    })

    return NextResponse.json({
      success: result.success,
      data: {
        summary: {
          totalWorkouts: result.totalWorkouts,
          wouldProcess: result.processedWorkouts,
          wouldSkip: result.skippedWorkouts,
          preview: true,
        },
        errors: result.errors,
        // Show sample of what would be processed
        sampleDetails: result.details.slice(0, 20),
        totalDetails: result.details.length,
      },
    })
  } catch (error) {
    console.error('[Backfill API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
