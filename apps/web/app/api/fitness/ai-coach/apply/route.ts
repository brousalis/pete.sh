/**
 * AI Coach Apply Suggestions API
 * POST - Apply AI-suggested routine changes by creating a new draft version
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { RoutineChange } from '@/lib/types/ai-coach.types'
import type { Workout } from '@/lib/types/fitness.types'
import { applyRoutineChanges, type ProgressiveOverloadEntry } from '@/lib/utils/routine-change-utils'

interface ApplyRequest {
  routineId?: string
  routineChanges: RoutineChange[]
  progressiveOverload?: ProgressiveOverloadEntry[]
  changeSummary: string
}

/**
 * POST /api/fitness/ai-coach/apply
 * Creates a new draft routine version with AI-suggested changes applied
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApplyRequest = await request.json()
    const routineId = body.routineId || 'climber-physique'

    if (
      (!body.routineChanges || body.routineChanges.length === 0) &&
      (!body.progressiveOverload || body.progressiveOverload.length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: 'No changes to apply' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // 1. Get the active version
    const { data: activeVersion, error: activeError } = await db
      .from('fitness_routine_versions')
      .select('*')
      .eq('routine_id', routineId)
      .eq('is_active', true)
      .single()

    if (activeError || !activeVersion) {
      return NextResponse.json(
        { success: false, error: 'No active routine version found' },
        { status: 404 }
      )
    }

    // 2. Get the latest version number
    const { data: latestVersion } = await db
      .from('fitness_routine_versions')
      .select('version_number')
      .eq('routine_id', routineId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const newVersionNumber = (latestVersion?.version_number || 0) + 1

    // 3. Deep clone and apply changes via shared utility
    const workoutDefs: Record<string, Workout> = JSON.parse(
      JSON.stringify(activeVersion.workout_definitions || {})
    )

    const { updatedDefs, changesApplied } = applyRoutineChanges(
      workoutDefs,
      body.routineChanges,
      body.progressiveOverload,
    )

    // 4. Create new draft version
    const { data: newVersion, error: createError } = await db
      .from('fitness_routine_versions')
      .insert({
        routine_id: routineId,
        version_number: newVersionNumber,
        name: `AI Coach Suggestion v${newVersionNumber}`,
        change_summary: body.changeSummary || `AI Coach: ${changesApplied} change(s) applied`,
        user_profile: activeVersion.user_profile,
        injury_protocol: activeVersion.injury_protocol,
        schedule: activeVersion.schedule,
        daily_routines: activeVersion.daily_routines,
        workout_definitions: updatedDefs,
        is_active: false,
        is_draft: true,
      })
      .select('id, version_number')
      .single()

    if (createError) {
      console.error('Error creating AI coach draft version:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create draft version' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        versionId: newVersion.id,
        versionNumber: newVersion.version_number,
        changesApplied,
        message: `Created draft version v${newVersion.version_number} with ${changesApplied} change(s). Review and activate when ready.`,
      },
    })
  } catch (error) {
    console.error('Error applying AI coach suggestions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
