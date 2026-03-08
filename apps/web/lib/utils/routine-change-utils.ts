/**
 * Pure utility for applying routine changes and progressive overload to workout definitions.
 * Shared by the /api/fitness/ai-coach/apply endpoint and the proposeRoutineVersion tool.
 */

import type { RoutineChange, DailyRoutineChange } from '@/lib/types/ai-coach.types'
import type { Workout, Exercise, DayOfWeek, DailyRoutine } from '@/lib/types/fitness.types'

export interface RoutineChangeDiffEntry {
  day: string
  section: string
  action: 'add' | 'remove' | 'modify' | 'swap'
  exerciseName: string
  field?: string
  before?: string
  after?: string
  reasoning?: string
}

export interface ProgressiveOverloadEntry {
  exerciseId?: string
  exerciseName: string
  suggestedWeight?: number
  suggestedReps?: number
  suggestedSets?: number
  reasoning?: string
}

function getExercises(workout: Workout, section: string): Exercise[] {
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

function setExercises(workout: Workout, section: string, exercises: Exercise[]) {
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
      if (workout.metabolicFlush) workout.metabolicFlush.exercises = exercises
      break
    case 'mobility':
      if (workout.mobility) workout.mobility.exercises = exercises
      break
  }
}

function formatVal(v: unknown): string {
  if (v === undefined || v === null) return '—'
  return String(v)
}

export function applyRoutineChanges(
  workoutDefs: Record<string, Workout>,
  routineChanges: RoutineChange[],
  progressiveOverload?: ProgressiveOverloadEntry[],
): { updatedDefs: Record<string, Workout>; changesApplied: number; diff: RoutineChangeDiffEntry[] } {
  const diff: RoutineChangeDiffEntry[] = []
  let changesApplied = 0

  if (routineChanges) {
    for (const change of routineChanges) {
      const day = change.day as DayOfWeek
      const workout = workoutDefs[day]
      if (!workout) continue

      const exercises = getExercises(workout, change.section)

      switch (change.action) {
        case 'add': {
          const name = change.newExerciseName || change.exerciseName || 'New Exercise'
          const newExercise: Exercise = {
            id: `${day}-ai-${Date.now()}-${changesApplied}`,
            name,
            sets: change.sets,
            reps: change.reps,
            weight: change.weight,
            duration: change.duration,
            rest: change.rest,
            form: change.form,
          }
          exercises.push(newExercise)
          setExercises(workout, change.section, exercises)
          changesApplied++

          const details: string[] = []
          if (change.sets) details.push(`${change.sets} sets`)
          if (change.reps) details.push(`${change.reps} reps`)
          if (change.weight) details.push(`${change.weight} lbs`)
          diff.push({
            day, section: change.section, action: 'add',
            exerciseName: name,
            after: details.length > 0 ? details.join(' x ') : undefined,
            reasoning: change.reasoning,
          })
          break
        }
        case 'remove': {
          const target = exercises.find(
            (e) => e.id === change.exerciseId ||
              e.name.toLowerCase() === change.exerciseName?.toLowerCase()
          )
          if (target) {
            const filtered = exercises.filter((e) => e !== target)
            setExercises(workout, change.section, filtered)
            changesApplied++
            diff.push({
              day, section: change.section, action: 'remove',
              exerciseName: target.name,
              reasoning: change.reasoning,
            })
          }
          break
        }
        case 'modify': {
          const target = exercises.find(
            (e) => e.id === change.exerciseId ||
              e.name.toLowerCase() === change.exerciseName?.toLowerCase()
          )
          if (target) {
            const fields: [string, unknown, unknown][] = []
            if (change.sets !== undefined) { fields.push(['sets', target.sets, change.sets]); target.sets = change.sets }
            if (change.reps !== undefined) { fields.push(['reps', target.reps, change.reps]); target.reps = change.reps }
            if (change.weight !== undefined) { fields.push(['weight', target.weight, change.weight]); target.weight = change.weight }
            if (change.duration !== undefined) { fields.push(['duration', target.duration, change.duration]); target.duration = change.duration }
            if (change.rest !== undefined) { fields.push(['rest', target.rest, change.rest]); target.rest = change.rest }
            if (change.form) { fields.push(['form', target.form, change.form]); target.form = change.form }
            if (change.newExerciseName) { fields.push(['name', target.name, change.newExerciseName]); target.name = change.newExerciseName }
            changesApplied++

            for (const [field, before, after] of fields) {
              diff.push({
                day, section: change.section, action: 'modify',
                exerciseName: change.exerciseName || target.name,
                field, before: formatVal(before), after: formatVal(after),
                reasoning: change.reasoning,
              })
            }
          }
          break
        }
        case 'swap': {
          const idx = exercises.findIndex(
            (e) => e.id === change.exerciseId ||
              e.name.toLowerCase() === change.exerciseName?.toLowerCase()
          )
          const current = idx >= 0 ? exercises[idx] : undefined
          if (current) {
            const oldName = current.name
            exercises[idx] = {
              ...current,
              name: change.newExerciseName ?? current.name,
              sets: change.sets ?? current.sets,
              reps: change.reps ?? current.reps,
              weight: change.weight ?? current.weight,
              duration: change.duration ?? current.duration,
              rest: change.rest ?? current.rest,
              form: change.form ?? current.form,
            }
            setExercises(workout, change.section, exercises)
            changesApplied++

            diff.push({
              day, section: change.section, action: 'swap',
              exerciseName: oldName,
              before: oldName,
              after: change.newExerciseName ?? oldName,
              reasoning: change.reasoning,
            })
          }
          break
        }
      }
    }
  }

  if (progressiveOverload) {
    for (const overload of progressiveOverload) {
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
          (e) => e.id === overload.exerciseId ||
            e.name.toLowerCase() === overload.exerciseName.toLowerCase()
        )

        if (target) {
          const fields: [string, unknown, unknown][] = []
          if (overload.suggestedWeight !== undefined) {
            fields.push(['weight', target.weight, overload.suggestedWeight])
            target.weight = overload.suggestedWeight
          }
          if (overload.suggestedReps !== undefined) {
            fields.push(['reps', target.reps, overload.suggestedReps])
            target.reps = overload.suggestedReps
          }
          if (overload.suggestedSets !== undefined) {
            fields.push(['sets', target.sets, overload.suggestedSets])
            target.sets = overload.suggestedSets
          }
          if (fields.length > 0) {
            changesApplied++
            for (const [field, before, after] of fields) {
              diff.push({
                day, section: 'progressive-overload', action: 'modify',
                exerciseName: target.name,
                field, before: formatVal(before), after: formatVal(after),
                reasoning: overload.reasoning,
              })
            }
          }
        }
      }
    }
  }

  return { updatedDefs: workoutDefs, changesApplied, diff }
}

// ============================================
// DAILY ROUTINE CHANGES (morning/night)
// ============================================

export interface DailyRoutineChangeDiffEntry {
  routineType: 'morning' | 'night'
  action: 'add' | 'remove' | 'modify' | 'swap'
  exerciseName: string
  field?: string
  before?: string
  after?: string
  reasoning?: string
}

type DailyRoutineExercise = DailyRoutine['exercises'][number]

function formatDurationSeconds(s: number): string {
  if (s >= 60) {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  return `${s}s`
}

export function applyDailyRoutineChanges(
  dailyRoutines: { morning: DailyRoutine; night: DailyRoutine },
  changes: DailyRoutineChange[],
): { updatedRoutines: { morning: DailyRoutine; night: DailyRoutine }; changesApplied: number; diff: DailyRoutineChangeDiffEntry[] } {
  const diff: DailyRoutineChangeDiffEntry[] = []
  let changesApplied = 0

  for (const change of changes) {
    const routine = dailyRoutines[change.routineType]
    if (!routine) continue

    const exercises = routine.exercises

    switch (change.action) {
      case 'add': {
        const name = change.newExerciseName || change.exerciseName || 'New Exercise'
        const newExercise: DailyRoutineExercise = {
          name,
          duration: change.duration ?? 60,
          description: change.description ?? '',
          why: change.why ?? '',
          action: change.actionCue ?? '',
          youtubeDemo: change.youtubeDemo,
        }
        exercises.push(newExercise)
        changesApplied++

        diff.push({
          routineType: change.routineType, action: 'add',
          exerciseName: name,
          after: formatDurationSeconds(newExercise.duration),
          reasoning: change.reasoning,
        })
        break
      }
      case 'remove': {
        const idx = exercises.findIndex(
          (e) => e.name.toLowerCase() === change.exerciseName?.toLowerCase()
        )
        if (idx >= 0) {
          const removed = exercises.splice(idx, 1)[0]!
          changesApplied++
          diff.push({
            routineType: change.routineType, action: 'remove',
            exerciseName: removed.name,
            reasoning: change.reasoning,
          })
        }
        break
      }
      case 'modify': {
        const target = exercises.find(
          (e) => e.name.toLowerCase() === change.exerciseName?.toLowerCase()
        )
        if (target) {
          const fields: [string, unknown, unknown][] = []
          if (change.duration !== undefined) { fields.push(['duration', target.duration, change.duration]); target.duration = change.duration }
          if (change.description !== undefined) { fields.push(['description', target.description, change.description]); target.description = change.description }
          if (change.why !== undefined) { fields.push(['why', target.why, change.why]); target.why = change.why }
          if (change.actionCue !== undefined) { fields.push(['action', target.action, change.actionCue]); target.action = change.actionCue }
          if (change.youtubeDemo !== undefined) { fields.push(['youtubeDemo', target.youtubeDemo, change.youtubeDemo]); target.youtubeDemo = change.youtubeDemo }
          if (change.newExerciseName) { fields.push(['name', target.name, change.newExerciseName]); target.name = change.newExerciseName }
          changesApplied++

          for (const [field, before, after] of fields) {
            diff.push({
              routineType: change.routineType, action: 'modify',
              exerciseName: change.exerciseName || target.name,
              field, before: formatVal(before), after: formatVal(after),
              reasoning: change.reasoning,
            })
          }
        }
        break
      }
      case 'swap': {
        const idx = exercises.findIndex(
          (e) => e.name.toLowerCase() === change.exerciseName?.toLowerCase()
        )
        if (idx >= 0) {
          const old = exercises[idx]!
          const oldName = old.name
          exercises[idx] = {
            ...old,
            name: change.newExerciseName ?? old.name,
            duration: change.duration ?? old.duration,
            description: change.description ?? old.description,
            why: change.why ?? old.why,
            action: change.actionCue ?? old.action,
            youtubeDemo: change.youtubeDemo ?? old.youtubeDemo,
          }
          changesApplied++

          diff.push({
            routineType: change.routineType, action: 'swap',
            exerciseName: oldName,
            before: oldName,
            after: change.newExerciseName ?? oldName,
            reasoning: change.reasoning,
          })
        }
        break
      }
    }

    // Recalculate routine duration
    routine.duration = Math.ceil(
      exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0) / 60
    )
  }

  return { updatedRoutines: dailyRoutines, changesApplied, diff }
}
