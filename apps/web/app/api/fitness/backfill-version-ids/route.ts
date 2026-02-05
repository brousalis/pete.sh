/**
 * Fitness Version ID Backfill API
 * POST - Backfill routineVersionId on historical workout/routine completions
 * GET  - Preview what would be backfilled (dry run)
 *
 * This stamps each workout completion and daily routine completion record
 * with the routine version ID that was active when it was recorded, using
 * the version activation timeline from fitness_routine_versions.
 */

import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest, NextResponse } from 'next/server'

interface BackfillVersionRequest {
  dryRun?: boolean
}

/**
 * POST /api/fitness/backfill-version-ids
 * Backfill routineVersionId on all historical completions
 *
 * Body:
 *   - dryRun?: boolean (if true, just preview what would happen)
 */
export async function POST(request: NextRequest) {
  try {
    const body: BackfillVersionRequest = await request.json().catch(() => ({}))
    const dryRun = body.dryRun ?? false

    console.log(`[Backfill Version IDs] Starting (dryRun: ${dryRun})`)

    const adapter = getFitnessAdapter()
    const result = await adapter.backfillVersionIds({ dryRun })

    console.log(
      `[Backfill Version IDs] Complete: ${result.weeksProcessed} weeks, ` +
      `${result.completionsUpdated} updated, ${result.completionsSkipped} skipped`
    )

    return NextResponse.json({
      success: result.success,
      data: {
        summary: {
          weeksProcessed: result.weeksProcessed,
          completionsUpdated: result.completionsUpdated,
          completionsSkipped: result.completionsSkipped,
          dryRun,
        },
        errors: result.errors,
      },
    })
  } catch (error) {
    console.error('[Backfill Version IDs] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/fitness/backfill-version-ids
 * Preview backfill (always dry run)
 */
export async function GET() {
  try {
    const adapter = getFitnessAdapter()
    const result = await adapter.backfillVersionIds({ dryRun: true })

    return NextResponse.json({
      success: result.success,
      data: {
        summary: {
          weeksProcessed: result.weeksProcessed,
          wouldUpdate: result.completionsUpdated,
          alreadyStamped: result.completionsSkipped,
          preview: true,
        },
        errors: result.errors,
      },
    })
  } catch (error) {
    console.error('[Backfill Version IDs] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
