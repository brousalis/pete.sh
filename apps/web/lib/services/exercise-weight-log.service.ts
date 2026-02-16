/**
 * Exercise Weight Log Service
 * Tracks progressive overload by recording actual weight/reps/RPE per exercise per session.
 * Used by the AI Coach to make data-driven progressive overload recommendations.
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { ExerciseWeightLog, DayOfWeek } from '@/lib/types/fitness.types'

interface DbExerciseWeightLog {
  id: string
  routine_version_id: string | null
  exercise_id: string
  exercise_name: string
  day_of_week: string
  week_number: number
  year: number
  weight_lbs: number | null
  sets_completed: number | null
  reps_completed: number | null
  rpe: number | null
  notes: string | null
  logged_at: string
  created_at: string
}

function dbToLog(db: DbExerciseWeightLog): ExerciseWeightLog {
  return {
    id: db.id,
    routineVersionId: db.routine_version_id || undefined,
    exerciseId: db.exercise_id,
    exerciseName: db.exercise_name,
    dayOfWeek: db.day_of_week as DayOfWeek,
    weekNumber: db.week_number,
    year: db.year,
    weightLbs: db.weight_lbs || undefined,
    setsCompleted: db.sets_completed || undefined,
    repsCompleted: db.reps_completed || undefined,
    rpe: db.rpe || undefined,
    notes: db.notes || undefined,
    loggedAt: db.logged_at,
  }
}

class ExerciseWeightLogService {
  /**
   * Log exercise weight/reps for a session
   */
  async logExercise(log: ExerciseWeightLog): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { error } = await db.from('exercise_weight_logs').insert({
      routine_version_id: log.routineVersionId || null,
      exercise_id: log.exerciseId,
      exercise_name: log.exerciseName,
      day_of_week: log.dayOfWeek,
      week_number: log.weekNumber,
      year: log.year,
      weight_lbs: log.weightLbs || null,
      sets_completed: log.setsCompleted || null,
      reps_completed: log.repsCompleted || null,
      rpe: log.rpe || null,
      notes: log.notes || null,
      logged_at: log.loggedAt || new Date().toISOString(),
    })

    if (error) {
      console.error('Error logging exercise weight:', error)
      return false
    }

    return true
  }

  /**
   * Log multiple exercises at once (batch after workout completion)
   */
  async logExercises(logs: ExerciseWeightLog[]): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const inserts = logs.map((log) => ({
      routine_version_id: log.routineVersionId || null,
      exercise_id: log.exerciseId,
      exercise_name: log.exerciseName,
      day_of_week: log.dayOfWeek,
      week_number: log.weekNumber,
      year: log.year,
      weight_lbs: log.weightLbs || null,
      sets_completed: log.setsCompleted || null,
      reps_completed: log.repsCompleted || null,
      rpe: log.rpe || null,
      notes: log.notes || null,
      logged_at: log.loggedAt || new Date().toISOString(),
    }))

    const { error } = await db.from('exercise_weight_logs').insert(inserts)

    if (error) {
      console.error('Error batch logging exercise weights:', error)
      return false
    }

    return true
  }

  /**
   * Get exercise history for a specific exercise (for progressive overload tracking)
   */
  async getExerciseHistory(
    exerciseId: string,
    weeksBack: number = 8
  ): Promise<ExerciseWeightLog[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeksBack * 7)

    const { data, error } = await db
      .from('exercise_weight_logs')
      .select('*')
      .eq('exercise_id', exerciseId)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false })

    if (error) {
      console.error('Error fetching exercise history:', error)
      return []
    }

    return (data as DbExerciseWeightLog[]).map(dbToLog)
  }

  /**
   * Get exercise history by name (fuzzy, for AI coach queries)
   */
  async getExerciseHistoryByName(
    exerciseName: string,
    weeksBack: number = 8
  ): Promise<ExerciseWeightLog[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeksBack * 7)

    const { data, error } = await db
      .from('exercise_weight_logs')
      .select('*')
      .ilike('exercise_name', `%${exerciseName}%`)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false })

    if (error) {
      console.error('Error fetching exercise history by name:', error)
      return []
    }

    return (data as DbExerciseWeightLog[]).map(dbToLog)
  }

  /**
   * Get all recent exercise logs (for AI coach context assembly)
   */
  async getRecentLogs(weeksBack: number = 4): Promise<ExerciseWeightLog[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeksBack * 7)

    const { data, error } = await db
      .from('exercise_weight_logs')
      .select('*')
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false })

    if (error) {
      console.error('Error fetching recent exercise logs:', error)
      return []
    }

    return (data as DbExerciseWeightLog[]).map(dbToLog)
  }
}

export const exerciseWeightLogService = new ExerciseWeightLogService()
