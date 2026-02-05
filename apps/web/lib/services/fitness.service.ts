/**
 * Fitness Service
 * Handles fitness routine storage and management
 * Based on workout.md - comprehensive fitness tracking system
 */

import type {
    ConsistencyStats,
    DayOfWeek,
    FitnessProgress,
    WeeklyRoutine,
    Workout,
} from '@/lib/types/fitness.types'
import { promises as fs } from 'fs'
import path from 'path'

const ROUTINE_FILE = path.join(process.cwd(), 'data', 'fitness-routine.json')
const WORKOUT_DEFINITIONS_FILE = path.join(
  process.cwd(),
  'data',
  'workout-definitions.json'
)

// Export file paths for adapter use
export const ROUTINE_FILE_PATH = ROUTINE_FILE
export const WORKOUT_DEFINITIONS_FILE_PATH = WORKOUT_DEFINITIONS_FILE

export class FitnessService {
  /**
   * Ensure data directory exists
   */
  private async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(ROUTINE_FILE)
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }
  }

  /**
   * Get workout definitions (public method)
   */
  async getWorkoutDefinitions(): Promise<Record<DayOfWeek, Workout>> {
    try {
      const data = await fs.readFile(WORKOUT_DEFINITIONS_FILE, 'utf-8')
      return JSON.parse(data) as Record<DayOfWeek, Workout>
    } catch {
      return {} as Record<DayOfWeek, Workout>
    }
  }

  /**
   * Update all workout definitions
   */
  async updateWorkoutDefinitions(
    definitions: Record<DayOfWeek, Workout>
  ): Promise<Record<DayOfWeek, Workout>> {
    await this.ensureDataDir()
    await fs.writeFile(
      WORKOUT_DEFINITIONS_FILE,
      JSON.stringify(definitions, null, 2),
      'utf-8'
    )
    return definitions
  }

  /**
   * Update workout definition for a specific day
   */
  async updateWorkoutDefinition(
    day: DayOfWeek,
    workout: Workout
  ): Promise<Workout> {
    const definitions = await this.getWorkoutDefinitions()
    definitions[day] = workout
    await this.updateWorkoutDefinitions(definitions)
    return workout
  }

  /**
   * Get current week number (Monday start)
   */
  private getCurrentWeekNumber(): number {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    )
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return weekNumber
  }

  /**
   * Get start date of week (Monday)
   */
  private getWeekStartDate(weekNumber: number): Date {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = (weekNumber - 1) * 7
    const weekStart = new Date(startOfYear)
    weekStart.setDate(startOfYear.getDate() + days - startOfYear.getDay() + 1) // Monday
    return weekStart
  }

  /**
   * Get or create week routine
   */
  private async getOrCreateWeek(routine: WeeklyRoutine, weekNumber: number) {
    let week = routine.weeks.find(w => w.weekNumber === weekNumber)
    if (!week) {
      const startDate = this.getWeekStartDate(weekNumber)
      week = {
        weekNumber,
        startDate: startDate.toISOString(),
        days: {},
      }
      routine.weeks.push(week)
      routine.weeks.sort((a, b) => a.weekNumber - b.weekNumber)
    }
    return week
  }

  /**
   * Get weekly routine with workout definitions
   */
  async getRoutine(): Promise<WeeklyRoutine | null> {
    try {
      await this.ensureDataDir()
      const data = await fs.readFile(ROUTINE_FILE, 'utf-8')
      const routine = JSON.parse(data) as WeeklyRoutine

      // Ensure current week exists
      const currentWeek = this.getCurrentWeekNumber()
      await this.getOrCreateWeek(routine, currentWeek)

      // Load workout definitions
      const workoutDefinitions = await this.getWorkoutDefinitions()

      // Ensure all days have workout definitions in current week
      const week = routine.weeks.find(w => w.weekNumber === currentWeek)
      if (week) {
        const days: DayOfWeek[] = [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ]
        days.forEach(day => {
          if (!week.days[day]) {
            week.days[day] = {}
          }
          // Add workout definition if it exists and not already set
          if (workoutDefinitions[day] && !week.days[day]?.workout) {
            // Workout will be loaded from definitions when needed
          }
        })
        await this.updateRoutine(routine)
      }

      return routine
    } catch (error) {
      return null
    }
  }

  /**
   * Get workout for a specific day
   */
  async getWorkoutForDay(
    day: DayOfWeek,
    weekNumber?: number
  ): Promise<Workout | null> {
    const workoutDefinitions = await this.getWorkoutDefinitions()
    return workoutDefinitions[day] || null
  }

  /**
   * Update weekly routine
   */
  async updateRoutine(routine: WeeklyRoutine): Promise<WeeklyRoutine> {
    await this.ensureDataDir()
    routine.updatedAt = new Date().toISOString()
    await fs.writeFile(ROUTINE_FILE, JSON.stringify(routine, null, 2), 'utf-8')
    return routine
  }

  /**
   * Collect all exercise IDs from a workout (warmup, main, finisher, metabolic, mobility).
   */
  private getAllExerciseIdsFromWorkout(workout: Workout): string[] {
    const ids: string[] = []
    if (workout.warmup?.exercises?.length) {
      ids.push(...workout.warmup.exercises.map(e => e.id))
    }
    if (workout.exercises?.length) {
      ids.push(...workout.exercises.map(e => e.id))
    }
    if (workout.finisher?.length) {
      ids.push(...workout.finisher.map(e => e.id))
    }
    if (workout.metabolicFlush?.exercises?.length) {
      ids.push(...workout.metabolicFlush.exercises.map(e => e.id))
    }
    if (workout.mobility?.exercises?.length) {
      ids.push(...workout.mobility.exercises.map(e => e.id))
    }
    return ids
  }

  /**
   * Mark workout as complete. If exercisesCompleted is missing or empty, all exercises
   * in the workout are auto-completed.
   */
  async markWorkoutComplete(
    day: DayOfWeek,
    weekNumber: number,
    exercisesCompleted?: string[],
    routineVersionId?: string
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const workoutDef = await this.getWorkoutForDay(day, weekNumber)
    if (!workoutDef) {
      throw new Error(`No workout definition found for ${day}`)
    }

    const allIds = this.getAllExerciseIdsFromWorkout(workoutDef)
    const resolved = Array.from(
      new Set([...allIds, ...(exercisesCompleted ?? [])])
    )

    week.days[day]!.workout = {
      workoutId: workoutDef.id,
      completed: true,
      completedAt: new Date().toISOString(),
      exercisesCompleted: resolved,
      routineVersionId,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Uncomplete a workout - reverts it to incomplete state
   */
  async markWorkoutUncomplete(
    day: DayOfWeek,
    weekNumber: number
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = routine.weeks.find(w => w.weekNumber === weekNumber)
    if (!week || !week.days[day]?.workout) {
      return // Nothing to uncomplete
    }

    // Reset the workout completion state
    week.days[day]!.workout = {
      ...week.days[day]!.workout!,
      completed: false,
      completedAt: undefined,
      exercisesCompleted: [],
      // Also clear skipped state if any
      skipped: false,
      skippedReason: undefined,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Add exercises to the completed list without necessarily marking the workout as complete.
   * If all exercises are completed, marks the workout as complete.
   * Used by workout autocomplete to add exercises incrementally.
   */
  async addCompletedExercises(
    day: DayOfWeek,
    weekNumber: number,
    exerciseIds: string[],
    routineVersionId?: string
  ): Promise<{ allComplete: boolean; exercisesCompleted: string[] }> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const workoutDef = await this.getWorkoutForDay(day, weekNumber)
    if (!workoutDef) {
      throw new Error(`No workout definition found for ${day}`)
    }

    // Get all exercise IDs from the workout definition
    const allIds = this.getAllExerciseIdsFromWorkout(workoutDef)

    // Get currently completed exercises (or empty array)
    const currentlyCompleted = week.days[day]?.workout?.exercisesCompleted ?? []

    // Merge with new exercise IDs (deduped)
    const updatedCompleted = Array.from(new Set([...currentlyCompleted, ...exerciseIds]))

    // Check if all exercises are now complete
    const allComplete = allIds.every(id => updatedCompleted.includes(id))

    // Preserve existing version ID if already set, otherwise use the new one
    const versionId = week.days[day]?.workout?.routineVersionId ?? routineVersionId

    // Update the workout completion state
    week.days[day]!.workout = {
      workoutId: workoutDef.id,
      completed: allComplete,
      completedAt: allComplete ? new Date().toISOString() : undefined,
      exercisesCompleted: updatedCompleted,
      routineVersionId: versionId,
    }

    await this.updateRoutine(routine)

    return { allComplete, exercisesCompleted: updatedCompleted }
  }

  /**
   * Mark daily routine as complete
   */
  async markRoutineComplete(
    routineType: 'morning' | 'night',
    day: DayOfWeek,
    weekNumber: number,
    routineVersionId?: string
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const routineId = routine.dailyRoutines[routineType].id
    week.days[day]![`${routineType}Routine`] = {
      routineId,
      completed: true,
      completedAt: new Date().toISOString(),
      routineVersionId,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Mark daily routine as incomplete (undo completion)
   */
  async markRoutineIncomplete(
    routineType: 'morning' | 'night',
    day: DayOfWeek,
    weekNumber: number
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const key = `${routineType}Routine` as 'morningRoutine' | 'nightRoutine'
    const existing = week.days[day]?.[key]
    const routineId = routine.dailyRoutines[routineType].id
    week.days[day]![key] = {
      routineId,
      completed: false,
      completedAt: undefined,
      // Preserve the version ID for historical accuracy
      routineVersionId: existing?.routineVersionId,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Skip a workout with a reason
   */
  async skipWorkout(
    day: DayOfWeek,
    weekNumber: number,
    reason: string,
    routineVersionId?: string
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const workoutDef = await this.getWorkoutForDay(day, weekNumber)
    if (!workoutDef) {
      throw new Error(`No workout definition found for ${day}`)
    }

    week.days[day]!.workout = {
      workoutId: workoutDef.id,
      completed: false,
      skipped: true,
      skippedAt: new Date().toISOString(),
      skippedReason: reason,
      routineVersionId,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Unskip a workout (remove skip status)
   */
  async unskipWorkout(day: DayOfWeek, weekNumber: number): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      return // Nothing to unskip
    }

    // Remove workout entry entirely to reset state
    if (week.days[day]?.workout) {
      delete week.days[day]!.workout
    }

    await this.updateRoutine(routine)
  }

  /**
   * Skip a daily routine (morning/night) with a reason
   */
  async skipRoutine(
    routineType: 'morning' | 'night',
    day: DayOfWeek,
    weekNumber: number,
    reason: string,
    routineVersionId?: string
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const routineId = routine.dailyRoutines[routineType].id
    week.days[day]![`${routineType}Routine`] = {
      routineId,
      completed: false,
      skipped: true,
      skippedAt: new Date().toISOString(),
      skippedReason: reason,
      routineVersionId,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Unskip a daily routine (remove skip status)
   */
  async unskipRoutine(
    routineType: 'morning' | 'night',
    day: DayOfWeek,
    weekNumber: number
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      return // Nothing to unskip
    }

    // Remove routine entry entirely to reset state
    const key = `${routineType}Routine` as 'morningRoutine' | 'nightRoutine'
    if (week.days[day]?.[key]) {
      delete week.days[day]![key]
    }

    await this.updateRoutine(routine)
  }

  /**
   * Skip all activities (workout + morning + night routines) for a day
   */
  async skipDay(
    day: DayOfWeek,
    weekNumber: number,
    reason: string,
    routineVersionId?: string
  ): Promise<void> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, weekNumber)
    if (!week.days[day]) {
      week.days[day] = {}
    }

    const now = new Date().toISOString()

    // Skip workout if there's one scheduled for this day
    const workoutDef = await this.getWorkoutForDay(day, weekNumber)
    if (workoutDef) {
      week.days[day]!.workout = {
        workoutId: workoutDef.id,
        completed: false,
        skipped: true,
        skippedAt: now,
        skippedReason: reason,
        routineVersionId,
      }
    }

    // Skip morning routine
    week.days[day]!.morningRoutine = {
      routineId: routine.dailyRoutines.morning.id,
      completed: false,
      skipped: true,
      skippedAt: now,
      skippedReason: reason,
      routineVersionId,
    }

    // Skip night routine
    week.days[day]!.nightRoutine = {
      routineId: routine.dailyRoutines.night.id,
      completed: false,
      skipped: true,
      skippedAt: now,
      skippedReason: reason,
      routineVersionId,
    }

    await this.updateRoutine(routine)
  }

  /**
   * Get weekly progress
   */
  async getWeeklyProgress(weekNumber?: number): Promise<FitnessProgress> {
    const targetWeek = weekNumber || this.getCurrentWeekNumber()
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }

    const week = await this.getOrCreateWeek(routine, targetWeek)
    const workoutsByDay: FitnessProgress['workoutsByDay'] = {}

    let completedWorkouts = 0
    let totalWorkouts = 0
    let skippedWorkouts = 0
    let completedMorningRoutines = 0
    let totalMorningRoutines = 0
    let completedNightRoutines = 0
    let totalNightRoutines = 0

    const days: DayOfWeek[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]
    const workoutDefinitions = await this.getWorkoutDefinitions()

    days.forEach(day => {
      const dayData = week.days[day]
      const hasWorkout = !!workoutDefinitions[day]

      if (hasWorkout) {
        totalWorkouts++
        if (dayData?.workout?.completed) {
          completedWorkouts++
        }
        if (dayData?.workout?.skipped) {
          skippedWorkouts++
        }
      }

      // Morning routine exists every day
      totalMorningRoutines++
      if (dayData?.morningRoutine?.completed) {
        completedMorningRoutines++
      }

      // Night routine exists every day
      totalNightRoutines++
      if (dayData?.nightRoutine?.completed) {
        completedNightRoutines++
      }

      workoutsByDay[day] = {
        workout: dayData?.workout
          ? {
              completed: dayData.workout.completed || false,
              completedAt: dayData.workout.completedAt,
              skipped: dayData.workout.skipped,
              skippedAt: dayData.workout.skippedAt,
              skippedReason: dayData.workout.skippedReason,
            }
          : undefined,
        morningRoutine: dayData?.morningRoutine
          ? {
              completed: dayData.morningRoutine.completed || false,
              completedAt: dayData.morningRoutine.completedAt,
              skipped: dayData.morningRoutine.skipped,
              skippedAt: dayData.morningRoutine.skippedAt,
              skippedReason: dayData.morningRoutine.skippedReason,
            }
          : undefined,
        nightRoutine: dayData?.nightRoutine
          ? {
              completed: dayData.nightRoutine.completed || false,
              completedAt: dayData.nightRoutine.completedAt,
              skipped: dayData.nightRoutine.skipped,
              skippedAt: dayData.nightRoutine.skippedAt,
              skippedReason: dayData.nightRoutine.skippedReason,
            }
          : undefined,
      }
    })

    const now = new Date()
    return {
      week: targetWeek,
      year: now.getFullYear(),
      completedWorkouts,
      totalWorkouts,
      skippedWorkouts,
      completedMorningRoutines,
      totalMorningRoutines,
      completedNightRoutines,
      totalNightRoutines,
      workoutsByDay,
    }
  }

  /**
   * Get consistency stats for a given routine (and optional workout definitions).
   * Used by the adapter when routine/defs come from Supabase.
   */
  async getConsistencyStatsForRoutine(
    routine: WeeklyRoutine,
    workoutDefinitions?: Record<DayOfWeek, Workout>
  ): Promise<ConsistencyStats> {
    const defs = workoutDefinitions ?? (await this.getWorkoutDefinitions())

    const now = new Date()
    let totalWorkoutDays = 0
    let completedWorkoutDays = 0
    let totalMorningDays = 0
    let completedMorningDays = 0
    let totalNightDays = 0
    let completedNightDays = 0

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let lastActiveDate: Date | undefined

    // Check last 30 days
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() - i)
      const dayOfWeek = checkDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase() as DayOfWeek
      const weekNum = this.getCurrentWeekNumber() - Math.floor(i / 7)

      const week = routine.weeks.find(w => w.weekNumber === weekNum)
      const dayData = week?.days[dayOfWeek]

      // Check if any activity happened
      const hasActivity =
        dayData?.workout?.completed ||
        dayData?.morningRoutine?.completed ||
        dayData?.nightRoutine?.completed

      if (hasActivity) {
        if (i === 0 || tempStreak > 0) {
          tempStreak++
          currentStreak = i === 0 ? tempStreak : currentStreak
        }
        longestStreak = Math.max(longestStreak, tempStreak)
        if (!lastActiveDate) {
          lastActiveDate = checkDate
        }
      } else {
        tempStreak = 0
      }

      totalMorningDays++
      if (dayData?.morningRoutine?.completed) completedMorningDays++

      totalNightDays++
      if (dayData?.nightRoutine?.completed) completedNightDays++

      if (defs[dayOfWeek]) {
        totalWorkoutDays++
        if (dayData?.workout?.completed) completedWorkoutDays++
      }
    }

    const weeklyCompletion =
      totalWorkoutDays > 0 ? (completedWorkoutDays / totalWorkoutDays) * 100 : 0

    const monthlyCompletion =
      totalWorkoutDays > 0 ? (completedWorkoutDays / totalWorkoutDays) * 100 : 0

    return {
      currentStreak,
      longestStreak,
      weeklyCompletion: Math.round(weeklyCompletion),
      monthlyCompletion: Math.round(monthlyCompletion),
      totalDaysActive:
        completedWorkoutDays + completedMorningDays + completedNightDays,
      lastActiveDate: lastActiveDate?.toISOString(),
      streaks: {
        workouts: currentStreak,
        morningRoutines: completedMorningDays,
        nightRoutines: completedNightDays,
      },
    }
  }

  /**
   * Get consistency stats (uses local JSON routine only).
   * Prefer using the adapter in production so routine/defs come from Supabase.
   */
  async getConsistencyStats(): Promise<ConsistencyStats> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }
    return this.getConsistencyStatsForRoutine(routine)
  }
}
