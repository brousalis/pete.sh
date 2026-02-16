/**
 * Version Diff Service
 * Computes diffs between routine versions for the AI coach apply flow
 * and the version history UI.
 */

import type {
  DiffItem,
  DiffType,
  VersionDiff,
  RoutineVersionSummary,
} from '@/lib/types/routine-editor.types'
import type {
  Exercise,
  Workout,
  DayOfWeek,
  UserProfile,
  InjuryProtocol,
  DailyRoutine,
  WeeklySchedule,
} from '@/lib/types/fitness.types'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

// ============================================
// EXERCISE DIFFING
// ============================================

function diffExercises(
  oldExercises: Exercise[],
  newExercises: Exercise[],
  pathPrefix: string
): DiffItem<Exercise>[] {
  const diffs: DiffItem<Exercise>[] = []

  const oldMap = new Map(oldExercises.map((e) => [e.id, e]))
  const newMap = new Map(newExercises.map((e) => [e.id, e]))

  // Check for removed or modified exercises
  for (const [id, oldEx] of oldMap) {
    const newEx = newMap.get(id)
    if (!newEx) {
      diffs.push({
        type: 'removed',
        path: `${pathPrefix}.${id}`,
        oldValue: oldEx,
      })
    } else if (hasExerciseChanged(oldEx, newEx)) {
      diffs.push({
        type: 'modified',
        path: `${pathPrefix}.${id}`,
        oldValue: oldEx,
        newValue: newEx,
      })
    }
  }

  // Check for added exercises
  for (const [id, newEx] of newMap) {
    if (!oldMap.has(id)) {
      diffs.push({
        type: 'added',
        path: `${pathPrefix}.${id}`,
        newValue: newEx,
      })
    }
  }

  return diffs
}

function hasExerciseChanged(a: Exercise, b: Exercise): boolean {
  return (
    a.name !== b.name ||
    a.sets !== b.sets ||
    a.reps !== b.reps ||
    a.weight !== b.weight ||
    a.duration !== b.duration ||
    a.rest !== b.rest ||
    a.form !== b.form ||
    a.notes !== b.notes
  )
}

// ============================================
// WORKOUT DIFFING
// ============================================

function diffWorkoutDay(
  oldWorkout: Workout | undefined,
  newWorkout: Workout | undefined,
  day: DayOfWeek
): DiffItem<Exercise>[] {
  if (!oldWorkout && !newWorkout) return []

  const diffs: DiffItem<Exercise>[] = []

  const getExercisesForSection = (
    workout: Workout | undefined,
    section: string
  ): Exercise[] => {
    if (!workout) return []
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

  const sections = [
    'warmup',
    'exercises',
    'finisher',
    'metabolicFlush',
    'mobility',
  ]
  for (const section of sections) {
    const oldExercises = getExercisesForSection(oldWorkout, section)
    const newExercises = getExercisesForSection(newWorkout, section)
    diffs.push(
      ...diffExercises(oldExercises, newExercises, `${day}.${section}`)
    )
  }

  return diffs
}

// ============================================
// PROFILE & SCHEDULE DIFFING
// ============================================

function diffProfile(
  oldProfile: UserProfile | undefined,
  newProfile: UserProfile | undefined
): DiffItem<UserProfile>[] {
  if (!oldProfile && !newProfile) return []
  if (!oldProfile)
    return [{ type: 'added', path: 'profile', newValue: newProfile }]
  if (!newProfile)
    return [{ type: 'removed', path: 'profile', oldValue: oldProfile }]

  if (JSON.stringify(oldProfile) !== JSON.stringify(newProfile)) {
    return [
      {
        type: 'modified',
        path: 'profile',
        oldValue: oldProfile,
        newValue: newProfile,
      },
    ]
  }

  return []
}

function diffSchedule(
  oldSchedule: WeeklySchedule | undefined,
  newSchedule: WeeklySchedule | undefined
): DiffItem<WeeklySchedule[DayOfWeek]>[] {
  if (!oldSchedule && !newSchedule) return []

  const diffs: DiffItem<WeeklySchedule[DayOfWeek]>[] = []

  for (const day of DAYS) {
    const oldDay = oldSchedule?.[day]
    const newDay = newSchedule?.[day]
    if (JSON.stringify(oldDay) !== JSON.stringify(newDay)) {
      diffs.push({
        type: oldDay && newDay ? 'modified' : newDay ? 'added' : 'removed',
        path: `schedule.${day}`,
        oldValue: oldDay,
        newValue: newDay,
      })
    }
  }

  return diffs
}

function diffInjuryProtocol(
  oldProtocol: InjuryProtocol | undefined,
  newProtocol: InjuryProtocol | undefined
): DiffItem<InjuryProtocol>[] {
  if (!oldProtocol && !newProtocol) return []

  if (JSON.stringify(oldProtocol) !== JSON.stringify(newProtocol)) {
    return [
      {
        type: oldProtocol && newProtocol ? 'modified' : newProtocol ? 'added' : 'removed',
        path: 'injuryProtocol',
        oldValue: oldProtocol,
        newValue: newProtocol,
      },
    ]
  }

  return []
}

function diffDailyRoutines(
  oldRoutines: { morning?: DailyRoutine; night?: DailyRoutine } | undefined,
  newRoutines: { morning?: DailyRoutine; night?: DailyRoutine } | undefined
): DiffItem<DailyRoutine>[] {
  const diffs: DiffItem<DailyRoutine>[] = []

  for (const type of ['morning', 'night'] as const) {
    const oldRoutine = oldRoutines?.[type]
    const newRoutine = newRoutines?.[type]

    if (JSON.stringify(oldRoutine) !== JSON.stringify(newRoutine)) {
      diffs.push({
        type:
          oldRoutine && newRoutine
            ? 'modified'
            : newRoutine
              ? 'added'
              : 'removed',
        path: `dailyRoutines.${type}`,
        oldValue: oldRoutine,
        newValue: newRoutine,
      })
    }
  }

  return diffs
}

// ============================================
// MAIN DIFF FUNCTION
// ============================================

export function computeVersionDiff(
  versionA: {
    summary: RoutineVersionSummary
    userProfile?: UserProfile
    injuryProtocol?: InjuryProtocol
    schedule?: WeeklySchedule
    dailyRoutines?: { morning?: DailyRoutine; night?: DailyRoutine }
    workoutDefinitions?: Record<string, Workout>
  },
  versionB: {
    summary: RoutineVersionSummary
    userProfile?: UserProfile
    injuryProtocol?: InjuryProtocol
    schedule?: WeeklySchedule
    dailyRoutines?: { morning?: DailyRoutine; night?: DailyRoutine }
    workoutDefinitions?: Record<string, Workout>
  }
): VersionDiff {
  const profileDiffs = diffProfile(versionA.userProfile, versionB.userProfile)
  const scheduleDiffs = diffSchedule(versionA.schedule, versionB.schedule)
  const injuryDiffs = diffInjuryProtocol(
    versionA.injuryProtocol,
    versionB.injuryProtocol
  )
  const dailyRoutineDiffs = diffDailyRoutines(
    versionA.dailyRoutines,
    versionB.dailyRoutines
  )

  const workoutDiffs: Record<DayOfWeek, DiffItem<Exercise>[]> = {} as Record<
    DayOfWeek,
    DiffItem<Exercise>[]
  >
  let addedExercises = 0
  let removedExercises = 0
  let modifiedExercises = 0

  for (const day of DAYS) {
    const oldWorkout = versionA.workoutDefinitions?.[day]
    const newWorkout = versionB.workoutDefinitions?.[day]
    const dayDiffs = diffWorkoutDay(oldWorkout, newWorkout, day)
    workoutDiffs[day] = dayDiffs

    for (const diff of dayDiffs) {
      if (diff.type === 'added') addedExercises++
      else if (diff.type === 'removed') removedExercises++
      else if (diff.type === 'modified') modifiedExercises++
    }
  }

  const totalChanges =
    profileDiffs.length +
    scheduleDiffs.length +
    injuryDiffs.length +
    dailyRoutineDiffs.length +
    addedExercises +
    removedExercises +
    modifiedExercises

  return {
    versionA: versionA.summary,
    versionB: versionB.summary,
    changes: {
      profile: profileDiffs,
      schedule: scheduleDiffs,
      injuryProtocol: injuryDiffs,
      dailyRoutines: dailyRoutineDiffs,
      workouts: workoutDiffs,
    },
    summary: {
      totalChanges,
      addedExercises,
      removedExercises,
      modifiedExercises,
      scheduleCh: scheduleDiffs.length,
    },
  }
}

// ============================================
// HUMAN-READABLE DIFF DESCRIPTION
// ============================================

export function describeDiff(diff: VersionDiff): string {
  const lines: string[] = []

  if (diff.summary.totalChanges === 0) {
    return 'No changes between versions.'
  }

  lines.push(
    `${diff.summary.totalChanges} change(s) between v${diff.versionA.versionNumber} and v${diff.versionB.versionNumber}:`
  )

  // Profile changes
  for (const d of diff.changes.profile) {
    if (d.type === 'modified') {
      lines.push('- Profile updated')
    }
  }

  // Schedule changes
  for (const d of diff.changes.schedule) {
    lines.push(
      `- Schedule ${d.type}: ${d.path.replace('schedule.', '')}`
    )
  }

  // Injury protocol changes
  for (const d of diff.changes.injuryProtocol) {
    lines.push(`- Injury protocol ${d.type}`)
  }

  // Daily routine changes
  for (const d of diff.changes.dailyRoutines) {
    const routineType = d.path.includes('morning') ? 'Morning' : 'Night'
    lines.push(`- ${routineType} routine ${d.type}`)
  }

  // Workout changes by day
  for (const day of DAYS) {
    const dayDiffs = diff.changes.workouts[day]
    if (dayDiffs.length === 0) continue

    for (const d of dayDiffs) {
      const exerciseName =
        d.type === 'removed'
          ? d.oldValue?.name
          : d.newValue?.name || d.oldValue?.name
      const section = d.path.split('.')[1]

      switch (d.type) {
        case 'added':
          lines.push(
            `- ${capitalize(day)} ${section}: Added "${exerciseName}"${d.newValue?.sets ? ` (${d.newValue.sets}x${d.newValue.reps || '?'})` : ''}`
          )
          break
        case 'removed':
          lines.push(
            `- ${capitalize(day)} ${section}: Removed "${exerciseName}"`
          )
          break
        case 'modified': {
          const changes: string[] = []
          if (d.oldValue?.sets !== d.newValue?.sets)
            changes.push(`sets: ${d.oldValue?.sets} → ${d.newValue?.sets}`)
          if (d.oldValue?.reps !== d.newValue?.reps)
            changes.push(`reps: ${d.oldValue?.reps} → ${d.newValue?.reps}`)
          if (d.oldValue?.weight !== d.newValue?.weight)
            changes.push(
              `weight: ${d.oldValue?.weight || '?'} → ${d.newValue?.weight || '?'} lbs`
            )
          if (d.oldValue?.duration !== d.newValue?.duration)
            changes.push(
              `duration: ${d.oldValue?.duration} → ${d.newValue?.duration}s`
            )
          if (d.oldValue?.name !== d.newValue?.name)
            changes.push(`name: "${d.oldValue?.name}" → "${d.newValue?.name}"`)
          lines.push(
            `- ${capitalize(day)} ${section}: Modified "${exerciseName}" (${changes.join(', ')})`
          )
          break
        }
      }
    }
  }

  return lines.join('\n')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ============================================
// DIFF SUMMARY FOR AI COACH
// ============================================

export function formatDiffForChangeSummary(diff: VersionDiff): string {
  const parts: string[] = []

  if (diff.summary.addedExercises > 0) {
    parts.push(`+${diff.summary.addedExercises} exercises`)
  }
  if (diff.summary.removedExercises > 0) {
    parts.push(`-${diff.summary.removedExercises} exercises`)
  }
  if (diff.summary.modifiedExercises > 0) {
    parts.push(`~${diff.summary.modifiedExercises} exercises modified`)
  }
  if (diff.summary.scheduleCh > 0) {
    parts.push(`${diff.summary.scheduleCh} schedule changes`)
  }

  return parts.length > 0
    ? parts.join(', ')
    : 'No exercise changes'
}
