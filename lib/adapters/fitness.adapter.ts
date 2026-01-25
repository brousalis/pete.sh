/**
 * Fitness Adapter
 * Replaces JSON file storage with Supabase for fitness routines and progress
 * 
 * Unlike other adapters, fitness data is always read/written from Supabase
 * in both local and production modes (no caching layer - direct access)
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { FitnessService } from '@/lib/services/fitness.service'
import type {
  WeeklyRoutine,
  FitnessProgress,
  ConsistencyStats,
  DayOfWeek,
  Workout,
} from '@/lib/types/fitness.types'
import type {
  FitnessRoutineRow,
  FitnessRoutineInsert,
  FitnessWeekRow,
  FitnessWeekInsert,
  FitnessProgressRow,
  FitnessProgressInsert,
} from '@/lib/supabase/types'

/**
 * Fitness Adapter - manages fitness routines and progress
 * 
 * This adapter is unique in that it uses Supabase as the primary
 * data store in both local and production modes. The JSON file
 * is used as a fallback/seed when Supabase has no data.
 */
export class FitnessAdapter extends BaseAdapter<WeeklyRoutine, WeeklyRoutine> {
  private fitnessService: FitnessService
  private currentRoutineId: string = 'climber-physique'

  constructor(debug: boolean = false) {
    super({ serviceName: 'fitness', debug })
    this.fitnessService = new FitnessService()
  }

  /**
   * Fetch from service (JSON file) - used as fallback/seed
   */
  protected async fetchFromService(): Promise<WeeklyRoutine> {
    const routine = await this.fitnessService.getRoutine()
    if (!routine) {
      throw new Error('No fitness routine found')
    }
    return routine
  }

  /**
   * Fetch from Supabase cache
   */
  protected async fetchFromCache(): Promise<WeeklyRoutine | null> {
    return this.getRoutineFromSupabase()
  }

  /**
   * Write routine to Supabase
   */
  protected async writeToCache(data: WeeklyRoutine): Promise<SyncResult> {
    return this.saveRoutineToSupabase(data)
  }

  // ==========================================
  // Supabase Operations
  // ==========================================

  /**
   * Get routine from Supabase
   */
  private async getRoutineFromSupabase(): Promise<WeeklyRoutine | null> {
    if (!this.isSupabaseAvailable()) return null

    const client = this.getReadClient()
    if (!client) return null // Supabase not configured

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any
      
      // Get the routine
      const { data: routineData, error: routineError } = await clientAny
        .from('fitness_routines')
        .select('*')
        .eq('id', this.currentRoutineId)
        .single()

      if (routineError || !routineData) {
        this.log('No routine found in Supabase')
        return null
      }

      // Get weeks for this routine
      const { data: weeksData, error: weeksError } = await clientAny
        .from('fitness_weeks')
        .select('*')
        .eq('routine_id', this.currentRoutineId)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })

      if (weeksError) throw weeksError

      const row = routineData as FitnessRoutineRow
      const weeks = (weeksData ?? []) as FitnessWeekRow[]

      // Reconstruct the WeeklyRoutine object
      const routine: WeeklyRoutine = {
        id: row.id,
        name: row.name,
        userProfile: row.user_profile,
        injuryProtocol: row.injury_protocol ?? {
          status: 'inactive',
          name: '',
          description: '',
          dailyRehab: [],
          rules: [],
        },
        schedule: row.schedule,
        dailyRoutines: row.daily_routines,
        weeks: weeks.map(w => ({
          weekNumber: w.week_number,
          startDate: w.start_date,
          days: w.days as WeeklyRoutine['weeks'][0]['days'],
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }

      return routine
    } catch (error) {
      this.logError('Error fetching routine from Supabase', error)
      return null
    }
  }

  /**
   * Save routine to Supabase
   */
  private async saveRoutineToSupabase(routine: WeeklyRoutine): Promise<SyncResult> {
    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    let recordsWritten = 0

    try {
      // Upsert the main routine
      const routineInsert: FitnessRoutineInsert = {
        id: routine.id,
        name: routine.name,
        user_profile: routine.userProfile,
        injury_protocol: routine.injuryProtocol,
        schedule: routine.schedule,
        daily_routines: routine.dailyRoutines,
        updated_at: getCurrentTimestamp(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any
      
      const { error: routineError } = await clientAny
        .from('fitness_routines')
        .upsert(routineInsert, { onConflict: 'id' })

      if (routineError) throw routineError
      recordsWritten++

      // Upsert weeks
      for (const week of routine.weeks) {
        const weekInsert: FitnessWeekInsert = {
          routine_id: routine.id,
          week_number: week.weekNumber,
          year: new Date(week.startDate).getFullYear(),
          start_date: week.startDate.split('T')[0] ?? week.startDate,
          days: week.days,
          updated_at: getCurrentTimestamp(),
        }

        const { error: weekError } = await clientAny
          .from('fitness_weeks')
          .upsert(weekInsert, { onConflict: 'routine_id,week_number,year' })

        if (weekError) throw weekError
        recordsWritten++
      }

      return { success: true, recordsWritten }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logError('Error saving routine to Supabase', error)
      return { success: false, recordsWritten, error: errorMessage }
    }
  }

  // ==========================================
  // High-level API methods
  // ==========================================

  /**
   * Get the current weekly routine
   * Tries Supabase first, falls back to JSON file, then seeds Supabase
   */
  async getRoutine(): Promise<WeeklyRoutine | null> {
    // Try Supabase first
    if (this.isSupabaseAvailable()) {
      const supabaseRoutine = await this.getRoutineFromSupabase()
      if (supabaseRoutine) {
        return supabaseRoutine
      }

      // No data in Supabase - try to seed from JSON file
      this.log('No routine in Supabase, attempting to seed from JSON file')
      try {
        const fileRoutine = await this.fetchFromService()
        await this.saveRoutineToSupabase(fileRoutine)
        this.log('Seeded Supabase from JSON file')
        return fileRoutine
      } catch (error) {
        this.logError('Failed to seed from JSON file', error)
      }
    }

    // Fallback to JSON file
    return this.fitnessService.getRoutine()
  }

  /**
   * Get workout definition for a specific day
   */
  async getWorkoutForDay(day: DayOfWeek, weekNumber?: number): Promise<Workout | null> {
    return this.fitnessService.getWorkoutForDay(day, weekNumber)
  }

  /**
   * Get weekly progress
   */
  async getWeeklyProgress(weekNumber?: number): Promise<FitnessProgress> {
    // For now, delegate to the service which handles the logic
    // In the future, we could read directly from fitness_progress table
    return this.fitnessService.getWeeklyProgress(weekNumber)
  }

  /**
   * Get consistency stats
   */
  async getConsistencyStats(): Promise<ConsistencyStats> {
    return this.fitnessService.getConsistencyStats()
  }

  /**
   * Mark a workout as complete
   */
  async markWorkoutComplete(
    day: DayOfWeek,
    weekNumber: number,
    exercisesCompleted?: string[]
  ): Promise<void> {
    // Update via the service (which updates JSON)
    await this.fitnessService.markWorkoutComplete(day, weekNumber, exercisesCompleted)
    
    // Also update Supabase if available
    if (this.isSupabaseAvailable()) {
      const routine = await this.fitnessService.getRoutine()
      if (routine) {
        await this.saveRoutineToSupabase(routine)
      }
    }
  }

  /**
   * Mark a daily routine (morning/night) as complete
   */
  async markRoutineComplete(
    routineType: 'morning' | 'night',
    day: DayOfWeek,
    weekNumber: number
  ): Promise<void> {
    // Update via the service (which updates JSON)
    await this.fitnessService.markRoutineComplete(routineType, day, weekNumber)
    
    // Also update Supabase if available
    if (this.isSupabaseAvailable()) {
      const routine = await this.fitnessService.getRoutine()
      if (routine) {
        await this.saveRoutineToSupabase(routine)
      }
    }
  }

  /**
   * Mark a daily routine as incomplete (undo)
   */
  async markRoutineIncomplete(
    routineType: 'morning' | 'night',
    day: DayOfWeek,
    weekNumber: number
  ): Promise<void> {
    // Update via the service (which updates JSON)
    await this.fitnessService.markRoutineIncomplete(routineType, day, weekNumber)
    
    // Also update Supabase if available
    if (this.isSupabaseAvailable()) {
      const routine = await this.fitnessService.getRoutine()
      if (routine) {
        await this.saveRoutineToSupabase(routine)
      }
    }
  }

  /**
   * Update the routine
   */
  async updateRoutine(routine: WeeklyRoutine): Promise<WeeklyRoutine> {
    // Update JSON file
    const updated = await this.fitnessService.updateRoutine(routine)
    
    // Also update Supabase if available
    if (this.isSupabaseAvailable()) {
      await this.saveRoutineToSupabase(updated)
    }
    
    return updated
  }

  /**
   * Sync routine from JSON file to Supabase
   * Useful for initial data migration
   */
  async syncFromJsonToSupabase(): Promise<SyncResult> {
    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    try {
      const routine = await this.fetchFromService()
      return this.saveRoutineToSupabase(routine)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, recordsWritten: 0, error: errorMessage }
    }
  }

  /**
   * Get current week number
   */
  getCurrentWeekNumber(): number {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  /**
   * Get current day of week
   */
  getCurrentDayOfWeek(): DayOfWeek {
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[new Date().getDay()] ?? 'monday'
  }
}

// Export singleton instance
let fitnessAdapterInstance: FitnessAdapter | null = null

export function getFitnessAdapter(): FitnessAdapter {
  if (!fitnessAdapterInstance) {
    fitnessAdapterInstance = new FitnessAdapter()
  }
  return fitnessAdapterInstance
}
