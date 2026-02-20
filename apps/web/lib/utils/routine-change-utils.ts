/**
 * Pure utility for applying routine changes and progressive overload to workout definitions.
 * Shared by the /api/fitness/ai-coach/apply endpoint and the proposeRoutineVersion tool.
 */

import type { RoutineChange } from '@/lib/types/ai-coach.types'
import type { Workout, Exercise, DayOfWeek } from '@/lib/types/fitness.types'

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
