/**
 * Workout Autocomplete Service
 * Automatically completes exercises when HealthKit workouts sync from Apple Watch
 */

import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { AppleWorkoutType } from '@/lib/types/apple-health.types'
import type { DayOfWeek, Workout } from '@/lib/types/fitness.types'

// ============================================
// Types
// ============================================

export interface AutocompleteContext {
  healthkitWorkoutId: string
  workoutType: AppleWorkoutType
  linkedDay: DayOfWeek
  weekNumber: number
  year: number
  duration: number // seconds
}

export interface AutocompleteResult {
  success: boolean
  exercisesCompleted: string[]
  sectionsCompleted: string[]
  error?: string
}

export interface ExerciseMatch {
  exerciseId: string
  section: 'warmup' | 'exercises' | 'metabolicFlush' | 'mobility'
}

// ============================================
// Workout Type to Exercise Mapping
// ============================================

/**
 * Maps HealthKit workout types to exercise name patterns
 * Used to determine which exercises to auto-complete
 */
const WORKOUT_TYPE_PATTERNS: Record<AppleWorkoutType, string[]> = {
  // Strength workouts complete all main exercises
  functionalStrengthTraining: ['*'], // Complete all exercises
  traditionalStrengthTraining: ['*'], // Complete all exercises

  // Cardio workouts match specific equipment/activity
  running: ['run', 'sprint', 'jog'],
  walking: ['walk', 'hike', 'incline'],
  cycling: ['bike', 'cycling', 'spin'],
  rowing: ['row', 'rower', 'erg'],

  // Other workout types
  coreTraining: ['core', 'ab', 'plank', 'crunch'],
  hiit: ['hiit', 'circuit', 'interval'],
  stairClimbing: ['stair', 'climb', 'step'],
  elliptical: ['elliptical'],
  other: [],
}

/**
 * Minimum duration (seconds) for a workout type to trigger autocomplete
 * Prevents short warm-up activities from completing main workout sections
 */
const MIN_DURATION_FOR_SECTION = {
  exercises: 600,      // 10 minutes for main workout
  metabolicFlush: 900, // 15 minutes for cardio flush
  warmup: 180,         // 3 minutes for warmup
  mobility: 300,       // 5 minutes for mobility
} as const

// ============================================
// Service Class
// ============================================

class WorkoutAutocompleteService {
  /**
   * Main entry point - triggers autocomplete when a HealthKit workout syncs
   */
  async triggerAutocomplete(context: AutocompleteContext): Promise<AutocompleteResult> {
    const { healthkitWorkoutId, workoutType, linkedDay, weekNumber, year, duration } = context

    try {
      // Get the workout definition for the linked day
      const fitnessAdapter = getFitnessAdapter()
      const workout = await fitnessAdapter.getWorkoutForDay(linkedDay)

      if (!workout) {
        return {
          success: false,
          exercisesCompleted: [],
          sectionsCompleted: [],
          error: `No workout definition found for ${linkedDay}`,
        }
      }

      // Find matching exercises based on workout type
      const matches = this.mapWorkoutTypeToExercises(workoutType, workout, duration)

      if (matches.length === 0) {
        return {
          success: true,
          exercisesCompleted: [],
          sectionsCompleted: [],
        }
      }

      // Extract exercise IDs and unique sections
      const exerciseIds = matches.map(m => m.exerciseId)
      const sectionsCompleted = [...new Set(matches.map(m => m.section))]

      // Add exercises to the completed list via the fitness adapter
      // This will only mark the workout as complete if all exercises are done
      await fitnessAdapter.addCompletedExercises(linkedDay, weekNumber, exerciseIds)

      // Create links in the database
      await this.linkWorkoutToExercises(
        healthkitWorkoutId,
        workout.id,
        linkedDay,
        weekNumber,
        year,
        matches
      )

      return {
        success: true,
        exercisesCompleted: exerciseIds,
        sectionsCompleted,
      }
    } catch (error) {
      console.error('[WorkoutAutocomplete] Error triggering autocomplete:', error)
      return {
        success: false,
        exercisesCompleted: [],
        sectionsCompleted: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Maps a HealthKit workout type to exercises in a workout definition
   */
  mapWorkoutTypeToExercises(
    workoutType: AppleWorkoutType,
    workout: Workout,
    duration: number
  ): ExerciseMatch[] {
    const matches: ExerciseMatch[] = []
    const patterns = WORKOUT_TYPE_PATTERNS[workoutType] || []

    // Strength workouts complete ALL sections (warmup, exercises, mobility)
    if (patterns.includes('*')) {
      // Check duration threshold for main exercises
      if (duration >= MIN_DURATION_FOR_SECTION.exercises) {
        // Add warmup exercises
        if (workout.warmup?.exercises) {
          for (const exercise of workout.warmup.exercises) {
            if (exercise.id) {
              matches.push({ exerciseId: exercise.id, section: 'warmup' })
            }
          }
        }

        // Add all main exercises
        for (const exercise of workout.exercises) {
          if (exercise.id) {
            matches.push({ exerciseId: exercise.id, section: 'exercises' })
          }
        }

        // Add finisher exercises
        if (workout.finisher) {
          for (const exercise of workout.finisher) {
            if (exercise.id) {
              matches.push({ exerciseId: exercise.id, section: 'exercises' })
            }
          }
        }

        // Add mobility exercises (cooldown)
        if (workout.mobility?.exercises) {
          for (const exercise of workout.mobility.exercises) {
            if (exercise.id) {
              matches.push({ exerciseId: exercise.id, section: 'mobility' })
            }
          }
        }
      }
      return matches
    }

    // For cardio/specific workouts, match by name patterns
    const matchesPattern = (name: string): boolean => {
      const lowerName = name.toLowerCase()
      return patterns.some(pattern => lowerName.includes(pattern.toLowerCase()))
    }

    // Check warmup exercises
    if (workout.warmup?.exercises && duration >= MIN_DURATION_FOR_SECTION.warmup) {
      for (const exercise of workout.warmup.exercises) {
        if (exercise.id && matchesPattern(exercise.name)) {
          matches.push({ exerciseId: exercise.id, section: 'warmup' })
        }
      }
    }

    // Check main exercises (for non-strength cardio mixed in)
    if (duration >= MIN_DURATION_FOR_SECTION.exercises) {
      for (const exercise of workout.exercises) {
        if (exercise.id && matchesPattern(exercise.name)) {
          matches.push({ exerciseId: exercise.id, section: 'exercises' })
        }
      }
    }

    // Check metabolic flush
    if (workout.metabolicFlush?.exercises && duration >= MIN_DURATION_FOR_SECTION.metabolicFlush) {
      for (const exercise of workout.metabolicFlush.exercises) {
        if (exercise.id && matchesPattern(exercise.name)) {
          matches.push({ exerciseId: exercise.id, section: 'metabolicFlush' })
        }
      }
    }

    // Check mobility
    if (workout.mobility?.exercises && duration >= MIN_DURATION_FOR_SECTION.mobility) {
      for (const exercise of workout.mobility.exercises) {
        if (exercise.id && matchesPattern(exercise.name)) {
          matches.push({ exerciseId: exercise.id, section: 'mobility' })
        }
      }
    }

    return matches
  }

  /**
   * Creates junction records linking a HealthKit workout to completed exercises
   */
  async linkWorkoutToExercises(
    healthkitWorkoutId: string,
    routineId: string,
    dayOfWeek: DayOfWeek,
    weekNumber: number,
    year: number,
    matches: ExerciseMatch[]
  ): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      console.warn('[WorkoutAutocomplete] Supabase not configured, skipping link creation')
      return
    }

    try {
      // Build insert records
      const records = matches.map(match => ({
        healthkit_workout_id: healthkitWorkoutId,
        routine_id: routineId,
        day_of_week: dayOfWeek,
        week_number: weekNumber,
        year: year,
        exercise_id: match.exerciseId,
        section: match.section,
      }))

      // Upsert to handle re-syncs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('exercise_healthkit_links')
        .upsert(records, {
          onConflict: 'healthkit_workout_id,exercise_id,week_number,year',
        })

      if (error) {
        console.error('[WorkoutAutocomplete] Error creating links:', error)
        throw error
      }
    } catch (error) {
      console.error('[WorkoutAutocomplete] Error linking workout to exercises:', error)
      throw error
    }
  }

  /**
   * Gets linked HealthKit workouts for exercises on a given day
   */
  async getLinkedWorkoutsForDay(
    dayOfWeek: DayOfWeek,
    weekNumber: number,
    year: number
  ): Promise<Map<string, string[]>> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return new Map()
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('exercise_healthkit_links')
        .select('exercise_id, healthkit_workout_id')
        .eq('day_of_week', dayOfWeek)
        .eq('week_number', weekNumber)
        .eq('year', year)

      if (error) {
        console.error('[WorkoutAutocomplete] Error fetching links:', error)
        return new Map()
      }

      // Group by exercise_id -> workout_ids
      const exerciseToWorkouts = new Map<string, string[]>()
      for (const row of data || []) {
        const existing = exerciseToWorkouts.get(row.exercise_id) || []
        existing.push(row.healthkit_workout_id)
        exerciseToWorkouts.set(row.exercise_id, existing)
      }

      return exerciseToWorkouts
    } catch (error) {
      console.error('[WorkoutAutocomplete] Error fetching linked workouts:', error)
      return new Map()
    }
  }

  /**
   * Gets detailed HealthKit workout data for linked exercises
   * Returns workout summaries keyed by workout ID
   */
  async getLinkedWorkoutDetails(
    workoutIds: string[]
  ): Promise<Map<string, HealthKitWorkoutSummary>> {
    if (workoutIds.length === 0) {
      return new Map()
    }

    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return new Map()
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('apple_health_workouts')
        .select(`
          id,
          workout_type,
          start_date,
          end_date,
          duration,
          active_calories,
          total_calories,
          distance_miles,
          hr_average,
          hr_min,
          hr_max,
          hr_zones,
          cadence_average,
          pace_average
        `)
        .in('id', workoutIds)

      if (error) {
        console.error('[WorkoutAutocomplete] Error fetching workout details:', error)
        return new Map()
      }

      const workoutMap = new Map<string, HealthKitWorkoutSummary>()
      for (const row of data || []) {
        workoutMap.set(row.id, {
          id: row.id,
          workoutType: row.workout_type,
          startDate: row.start_date,
          endDate: row.end_date,
          duration: row.duration,
          activeCalories: row.active_calories,
          totalCalories: row.total_calories,
          distanceMiles: row.distance_miles,
          hrAverage: row.hr_average,
          hrMin: row.hr_min,
          hrMax: row.hr_max,
          hrZones: row.hr_zones,
          cadenceAverage: row.cadence_average,
          paceAverage: row.pace_average,
        })
      }

      return workoutMap
    } catch (error) {
      console.error('[WorkoutAutocomplete] Error fetching workout details:', error)
      return new Map()
    }
  }

  // ============================================
  // Backfill Methods
  // ============================================

  /**
   * Backfill historical HealthKit workouts to link with fitness routines.
   * This processes all unlinked workouts and creates exercise completion records.
   */
  async backfillHistoricalWorkouts(options?: {
    startDate?: string // ISO date string, defaults to all time
    endDate?: string   // ISO date string, defaults to now
    dryRun?: boolean   // If true, don't make changes, just return what would be done
  }): Promise<BackfillResult> {
    const { startDate, endDate, dryRun = false } = options || {}

    const result: BackfillResult = {
      success: true,
      totalWorkouts: 0,
      processedWorkouts: 0,
      skippedWorkouts: 0,
      exercisesCompleted: 0,
      errors: [],
      details: [],
    }

    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      result.success = false
      result.errors.push('Supabase not configured')
      return result
    }

    try {
      // Fetch all HealthKit workouts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('apple_health_workouts')
        .select('id, workout_type, start_date, duration, linked_day, linked_week, linked_year')
        .order('start_date', { ascending: true })

      if (startDate) {
        query = query.gte('start_date', startDate)
      }
      if (endDate) {
        query = query.lte('start_date', endDate)
      }

      const { data: workouts, error } = await query

      if (error) {
        result.success = false
        result.errors.push(`Failed to fetch workouts: ${error.message}`)
        return result
      }

      result.totalWorkouts = workouts?.length || 0
      console.log(`[Backfill] Found ${result.totalWorkouts} workouts to process`)

      // Process each workout
      for (const workout of workouts || []) {
        try {
          // Determine day of week from workout start date
          const workoutDate = new Date(workout.start_date)
          const dayOfWeek = this.getDayOfWeek(workoutDate)
          const weekNumber = this.getWeekNumber(workoutDate)
          const year = workoutDate.getFullYear()

          // Check if this workout already has links
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingLinks } = await (supabase as any)
            .from('exercise_healthkit_links')
            .select('id')
            .eq('healthkit_workout_id', workout.id)
            .limit(1)

          if (existingLinks && existingLinks.length > 0) {
            result.skippedWorkouts++
            result.details.push({
              workoutId: workout.id,
              workoutType: workout.workout_type,
              date: workout.start_date,
              dayOfWeek,
              status: 'skipped',
              reason: 'Already has links',
            })
            continue
          }

          if (dryRun) {
            result.processedWorkouts++
            result.details.push({
              workoutId: workout.id,
              workoutType: workout.workout_type,
              date: workout.start_date,
              dayOfWeek,
              status: 'would_process',
              reason: 'Dry run - no changes made',
            })
            continue
          }

          // Run autocomplete for this workout
          const autocompleteResult = await this.triggerAutocomplete({
            healthkitWorkoutId: workout.id,
            workoutType: workout.workout_type,
            linkedDay: dayOfWeek,
            weekNumber,
            year,
            duration: workout.duration,
          })

          if (autocompleteResult.success) {
            result.processedWorkouts++
            result.exercisesCompleted += autocompleteResult.exercisesCompleted.length
            result.details.push({
              workoutId: workout.id,
              workoutType: workout.workout_type,
              date: workout.start_date,
              dayOfWeek,
              status: 'processed',
              exercisesCompleted: autocompleteResult.exercisesCompleted.length,
              sectionsCompleted: autocompleteResult.sectionsCompleted,
            })
          } else {
            result.skippedWorkouts++
            result.details.push({
              workoutId: workout.id,
              workoutType: workout.workout_type,
              date: workout.start_date,
              dayOfWeek,
              status: 'error',
              reason: autocompleteResult.error || 'Unknown error',
            })
          }
        } catch (err) {
          result.skippedWorkouts++
          result.errors.push(`Error processing workout ${workout.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          result.details.push({
            workoutId: workout.id,
            workoutType: workout.workout_type,
            date: workout.start_date,
            dayOfWeek: 'unknown',
            status: 'error',
            reason: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }

      console.log(`[Backfill] Complete: ${result.processedWorkouts} processed, ${result.skippedWorkouts} skipped, ${result.exercisesCompleted} exercises completed`)
      return result
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * Get day of week from a date
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[date.getDay()] ?? 'monday'
  }

  /**
   * Get ISO week number from a date
   */
  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }
}

// ============================================
// Backfill Types
// ============================================

export interface BackfillResult {
  success: boolean
  totalWorkouts: number
  processedWorkouts: number
  skippedWorkouts: number
  exercisesCompleted: number
  errors: string[]
  details: BackfillWorkoutDetail[]
}

export interface BackfillWorkoutDetail {
  workoutId: string
  workoutType: string
  date: string
  dayOfWeek: string
  status: 'processed' | 'skipped' | 'error' | 'would_process'
  reason?: string
  exercisesCompleted?: number
  sectionsCompleted?: string[]
}

// ============================================
// Types for External Use
// ============================================

export interface HealthKitWorkoutSummary {
  id: string
  workoutType: AppleWorkoutType
  startDate: string
  endDate: string
  duration: number
  activeCalories: number
  totalCalories: number
  distanceMiles?: number
  hrAverage?: number
  hrMin?: number
  hrMax?: number
  hrZones?: Array<{
    name: string
    minBpm: number
    maxBpm: number
    duration: number
    percentage: number
  }>
  cadenceAverage?: number
  paceAverage?: number
}

// ============================================
// Export Singleton
// ============================================

export const workoutAutocompleteService = new WorkoutAutocompleteService()
