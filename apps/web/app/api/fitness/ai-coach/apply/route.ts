/**
 * AI Coach Apply Suggestions API
 * POST - Apply AI-suggested routine changes by creating a new draft version
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { RoutineChange } from '@/lib/types/ai-coach.types'
import type { Workout, Exercise, DayOfWeek } from '@/lib/types/fitness.types'

interface ApplyRequest {
  routineId?: string
  routineChanges: RoutineChange[]
  progressiveOverload?: {
    exerciseId?: string
    exerciseName: string
    suggestedWeight?: number
    suggestedReps?: number
    suggestedSets?: number
  }[]
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

    // 3. Deep clone the workout definitions from the active version
    const workoutDefs: Record<string, Workout> = JSON.parse(
      JSON.stringify(activeVersion.workout_definitions || {})
    )

    // 4. Apply routine changes
    let changesApplied = 0

    if (body.routineChanges) {
      for (const change of body.routineChanges) {
        const day = change.day as DayOfWeek
        const workout = workoutDefs[day]
        if (!workout) continue

        const getExercises = (section: string): Exercise[] => {
          switch (section) {
            case 'warmup':
              return workout.warmup?.exercises || []
            case 'exercises':
              return workout.exercises || []
            case 'finisher':
              return workout.finisher || []
            case 'metabolicFlush':
              return workout.metabolicFlush?.exercises || []
            case 'mobility':
              return workout.mobility?.exercises || []
            default:
              return []
          }
        }

        const setExercises = (section: string, exercises: Exercise[]) => {
          switch (section) {
            case 'warmup':
              if (workout.warmup) workout.warmup.exercises = exercises
              break
            case 'exercises':
              workout.exercises = exercises
              break
            case 'finisher':
              workout.finisher = exercises
              break
            case 'metabolicFlush':
              if (workout.metabolicFlush)
                workout.metabolicFlush.exercises = exercises
              break
            case 'mobility':
              if (workout.mobility) workout.mobility.exercises = exercises
              break
          }
        }

        const exercises = getExercises(change.section)

        switch (change.action) {
          case 'add': {
            const newExercise: Exercise = {
              id: `${day}-ai-${Date.now()}`,
              name: change.newExerciseName || change.exerciseName || 'New Exercise',
              sets: change.sets,
              reps: change.reps,
              weight: change.weight,
              duration: change.duration,
              rest: change.rest,
              form: change.form,
            }
            exercises.push(newExercise)
            setExercises(change.section, exercises)
            changesApplied++
            break
          }
          case 'remove': {
            if (change.exerciseId) {
              const filtered = exercises.filter(
                (e) => e.id !== change.exerciseId
              )
              if (filtered.length < exercises.length) {
                setExercises(change.section, filtered)
                changesApplied++
              }
            }
            break
          }
          case 'modify': {
            const target = exercises.find(
              (e) =>
                e.id === change.exerciseId ||
                e.name.toLowerCase() === change.exerciseName?.toLowerCase()
            )
            if (target) {
              if (change.sets !== undefined) target.sets = change.sets
              if (change.reps !== undefined) target.reps = change.reps
              if (change.weight !== undefined) target.weight = change.weight
              if (change.duration !== undefined)
                target.duration = change.duration
              if (change.rest !== undefined) target.rest = change.rest
              if (change.form) target.form = change.form
              if (change.newExerciseName) target.name = change.newExerciseName
              changesApplied++
            }
            break
          }
          case 'swap': {
            const idx = exercises.findIndex(
              (e) =>
                e.id === change.exerciseId ||
                e.name.toLowerCase() === change.exerciseName?.toLowerCase()
            )
            const current = idx >= 0 ? exercises[idx] : undefined
            if (current) {
              exercises[idx!] = {
                ...current,
                name: change.newExerciseName ?? current.name,
                sets: change.sets ?? current.sets,
                reps: change.reps ?? current.reps,
                weight: change.weight ?? current.weight,
                duration: change.duration ?? current.duration,
                rest: change.rest ?? current.rest,
                form: change.form ?? current.form,
              }
              setExercises(change.section, exercises)
              changesApplied++
            }
            break
          }
        }
      }
    }

    // 5. Apply progressive overload changes
    if (body.progressiveOverload) {
      for (const overload of body.progressiveOverload) {
        for (const day of Object.keys(workoutDefs) as DayOfWeek[]) {
          const workout = workoutDefs[day]
          if (!workout) continue

          const allExercises = [
            ...(workout.warmup?.exercises || []),
            ...workout.exercises,
            ...(workout.finisher || []),
            ...(workout.metabolicFlush?.exercises || []),
            ...(workout.mobility?.exercises || []),
          ]

          const target = allExercises.find(
            (e) =>
              e.id === overload.exerciseId ||
              e.name.toLowerCase() === overload.exerciseName.toLowerCase()
          )

          if (target) {
            if (overload.suggestedWeight !== undefined)
              target.weight = overload.suggestedWeight
            if (overload.suggestedReps !== undefined)
              target.reps = overload.suggestedReps
            if (overload.suggestedSets !== undefined)
              target.sets = overload.suggestedSets
            changesApplied++
          }
        }
      }
    }

    // 6. Create new draft version
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
        workout_definitions: workoutDefs,
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
