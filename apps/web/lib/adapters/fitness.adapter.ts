/**
 * Fitness Adapter
 * Replaces JSON file storage with Supabase for fitness routines and progress
 *
 * Fitness data is primarily stored in Supabase. The local JSON file
 * serves as a fallback/seed when Supabase has no data or is unavailable.
 */

import { FitnessService } from '@/lib/services/fitness.service'
import type {
    FitnessRoutineInsert,
    FitnessRoutineRow,
    FitnessRoutineVersionInsert,
    FitnessRoutineVersionRow,
    FitnessWeekInsert,
    FitnessWeekRow
} from '@/lib/supabase/types'
import type {
    ConsistencyStats,
    DayOfWeek,
    FitnessProgress,
    WeeklyRoutine,
    Workout,
} from '@/lib/types/fitness.types'
import type {
    CreateVersionRequest,
    RoutineVersion,
    RoutineVersionSummary,
    UpdateVersionRequest,
    VersionsListResponse,
} from '@/lib/types/routine-editor.types'
import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'

/**
 * Fitness Adapter - manages fitness routines and progress
 *
 * This adapter uses Supabase as the primary data store.
 * The JSON file is used as a fallback/seed when Supabase has no data.
 */
export class FitnessAdapter extends BaseAdapter<WeeklyRoutine, WeeklyRoutine> {
  private fitnessService: FitnessService
  private currentRoutineId: string = 'climber-physique'

  constructor(debug: boolean = false) {
    super({ serviceName: 'fitness', debug })
    this.fitnessService = new FitnessService()
  }

  /**
   * Check if fitness service is available
   * Fitness uses Supabase as primary storage, but local JSON as fallback.
   * Always returns true since JSON fallback is always available.
   */
  protected async checkServiceAvailability(): Promise<boolean> {
    // Fitness service is always "available" - we either use Supabase
    // or fall back to local JSON files
    return true
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
   * Checks active version in Supabase first, falls back to JSON file
   */
  async getWorkoutForDay(day: DayOfWeek, weekNumber?: number): Promise<Workout | null> {
    // Try to get from active version in Supabase first
    if (this.isSupabaseAvailable()) {
      const client = this.getReadClient()
      if (client) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clientAny = client as any

          const { data, error } = await clientAny
            .from('fitness_routine_versions')
            .select('workout_definitions')
            .eq('routine_id', this.currentRoutineId)
            .eq('is_active', true)
            .single()

          if (!error && data?.workout_definitions?.[day]) {
            return data.workout_definitions[day] as Workout
          }
        } catch {
          // Fall back to JSON file
        }
      }
    }

    // Fall back to JSON file
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
   * Uses routine and workout definitions from Supabase (or JSON fallback) so it works in production.
   */
  async getConsistencyStats(): Promise<ConsistencyStats> {
    const routine = await this.getRoutine()
    if (!routine) {
      throw new Error('No routine found')
    }
    const workoutDefinitions = await this.getWorkoutDefinitions(this.currentRoutineId)
    return this.fitnessService.getConsistencyStatsForRoutine(routine, workoutDefinitions)
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
   * Add exercises to the completed list without necessarily marking the workout complete
   * Used by workout autocomplete to incrementally complete exercises
   */
  async addCompletedExercises(
    day: DayOfWeek,
    weekNumber: number,
    exerciseIds: string[]
  ): Promise<{ allComplete: boolean; exercisesCompleted: string[] }> {
    // Update via the service (which updates JSON)
    const result = await this.fitnessService.addCompletedExercises(day, weekNumber, exerciseIds)

    // Also update Supabase if available
    if (this.isSupabaseAvailable()) {
      const routine = await this.fitnessService.getRoutine()
      if (routine) {
        await this.saveRoutineToSupabase(routine)
      }
    }

    return result
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

  // ==========================================
  // Version Management Methods
  // ==========================================

  /**
   * Get all versions for a routine
   * Falls back to creating a virtual version from JSON files if Supabase is unavailable
   */
  async getVersions(routineId: string): Promise<VersionsListResponse> {
    // Try Supabase first
    if (this.isSupabaseAvailable()) {
      const client = this.getReadClient()
      if (client) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clientAny = client as any

          const { data, error } = await clientAny
            .from('fitness_routine_versions')
            .select('id, version_number, name, change_summary, is_active, is_draft, created_at, activated_at')
            .eq('routine_id', routineId)
            .order('version_number', { ascending: false })

          if (!error && data && data.length > 0) {
            const versions: RoutineVersionSummary[] = data.map((row: Partial<FitnessRoutineVersionRow>) => ({
              id: row.id!,
              versionNumber: row.version_number!,
              name: row.name!,
              changeSummary: row.change_summary ?? undefined,
              isActive: row.is_active!,
              isDraft: row.is_draft!,
              createdAt: row.created_at!,
              activatedAt: row.activated_at ?? undefined,
            }))

            const activeVersion = versions.find(v => v.isActive)

            // Only consider drafts newer than active version as "the draft"
            // (older drafts are orphaned and should be cleaned up)
            const activeVersionNum = activeVersion?.versionNumber ?? 0
            const validDrafts = versions.filter(v => v.isDraft && v.versionNumber > activeVersionNum)
            const draftVersion = validDrafts[0] // Newest draft (already sorted desc)

            return { versions, activeVersion, draftVersion }
          }
        } catch (error) {
          this.logError('Error fetching versions from Supabase', error)
        }
      }
    }

    // Fall back to JSON files - create a virtual "active" version
    try {
      const routine = await this.fitnessService.getRoutine()
      if (routine) {
        const virtualVersion: RoutineVersionSummary = {
          id: 'json-fallback',
          versionNumber: 1,
          name: routine.name,
          changeSummary: 'Loaded from local files',
          isActive: true,
          isDraft: false,
          createdAt: routine.updatedAt ?? new Date().toISOString(),
        }
        return {
          versions: [virtualVersion],
          activeVersion: virtualVersion,
          draftVersion: undefined
        }
      }
    } catch (error) {
      this.logError('Error creating virtual version from JSON', error)
    }

    return { versions: [] }
  }

  /**
   * Get a specific version by ID
   * Handles the special 'json-fallback' ID for local file data
   */
  async getVersion(versionId: string): Promise<RoutineVersion | null> {
    // Handle JSON fallback version
    if (versionId === 'json-fallback') {
      try {
        const routine = await this.fitnessService.getRoutine()
        const workoutDefinitions = await this.fitnessService.getWorkoutDefinitions()

        if (!routine) return null

        return {
          id: 'json-fallback',
          routineId: this.currentRoutineId,
          versionNumber: 1,
          name: routine.name,
          changeSummary: 'Loaded from local files',
          userProfile: routine.userProfile,
          injuryProtocol: routine.injuryProtocol,
          schedule: routine.schedule,
          dailyRoutines: routine.dailyRoutines,
          workoutDefinitions,
          isActive: true,
          isDraft: false,
          createdAt: routine.updatedAt ?? new Date().toISOString(),
          updatedAt: routine.updatedAt ?? new Date().toISOString(),
        }
      } catch (error) {
        this.logError('Error loading version from JSON files', error)
        return null
      }
    }

    // Try Supabase
    if (!this.isSupabaseAvailable()) {
      return null
    }

    const client = this.getReadClient()
    if (!client) return null

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      const { data, error } = await clientAny
        .from('fitness_routine_versions')
        .select('*')
        .eq('id', versionId)
        .single()

      if (error || !data) return null

      const row = data as FitnessRoutineVersionRow
      return this.rowToVersion(row)
    } catch (error) {
      this.logError('Error fetching version', error)
      return null
    }
  }

  /**
   * Create a new version (draft by default)
   * Uses retry logic to handle race conditions with version numbers
   */
  async createVersion(request: CreateVersionRequest, retryCount = 0): Promise<RoutineVersion | null> {
    const MAX_RETRIES = 3

    if (!this.isSupabaseAvailable()) {
      // Create version from current JSON files if Supabase not available
      const routine = await this.fitnessService.getRoutine()
      const workoutDefinitions = await this.fitnessService.getWorkoutDefinitions()

      if (!routine) return null

      // Return a mock version object
      return {
        id: crypto.randomUUID(),
        routineId: request.routineId,
        versionNumber: 1,
        name: request.name ?? routine.name,
        changeSummary: request.changeSummary,
        userProfile: routine.userProfile,
        injuryProtocol: routine.injuryProtocol,
        schedule: routine.schedule,
        dailyRoutines: routine.dailyRoutines,
        workoutDefinitions,
        isActive: false,
        isDraft: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    const client = this.getWriteClient()
    if (!client) return null

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      // Get the latest version number using MAX aggregate for accuracy
      const { data: versionData } = await clientAny
        .from('fitness_routine_versions')
        .select('version_number')
        .eq('routine_id', request.routineId)
        .order('version_number', { ascending: false })
        .limit(1)

      const maxVersion = versionData?.[0]?.version_number ?? 0
      const nextVersionNumber = maxVersion + 1

      // Get base data - either from specified version or current active
      let baseData: RoutineVersion | null = null
      if (request.basedOnVersionId) {
        baseData = await this.getVersion(request.basedOnVersionId)
      }

      if (!baseData) {
        // Get current active version or fall back to JSON files
        const { data: activeData } = await clientAny
          .from('fitness_routine_versions')
          .select('*')
          .eq('routine_id', request.routineId)
          .eq('is_active', true)
          .single()

        if (activeData) {
          baseData = this.rowToVersion(activeData as FitnessRoutineVersionRow)
        } else {
          // Fall back to JSON files
          const routine = await this.fitnessService.getRoutine()
          const workoutDefinitions = await this.fitnessService.getWorkoutDefinitions()

          if (!routine) return null

          baseData = {
            id: '',
            routineId: request.routineId,
            versionNumber: 0,
            name: routine.name,
            userProfile: routine.userProfile,
            injuryProtocol: routine.injuryProtocol,
            schedule: routine.schedule,
            dailyRoutines: routine.dailyRoutines,
            workoutDefinitions,
            isActive: false,
            isDraft: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
      }

      // Create new version
      const insert: FitnessRoutineVersionInsert = {
        routine_id: request.routineId,
        version_number: nextVersionNumber,
        name: request.name ?? `Version ${nextVersionNumber}`,
        change_summary: request.changeSummary ?? undefined,
        user_profile: baseData.userProfile,
        injury_protocol: baseData.injuryProtocol ?? undefined,
        schedule: baseData.schedule,
        daily_routines: baseData.dailyRoutines,
        workout_definitions: baseData.workoutDefinitions,
        is_active: false,
        is_draft: true,
        updated_at: getCurrentTimestamp(),
      }

      const { data, error } = await clientAny
        .from('fitness_routine_versions')
        .insert(insert)
        .select()
        .single()

      if (error) throw error

      return this.rowToVersion(data as FitnessRoutineVersionRow)
    } catch (error: unknown) {
      // Check if it's a duplicate key error (code 23505)
      const pgError = error as { code?: string }
      if (pgError.code === '23505' && retryCount < MAX_RETRIES) {
        this.log(`Duplicate version number, retrying (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        // Small delay before retry to reduce collision chance
        await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)))
        return this.createVersion(request, retryCount + 1)
      }

      this.logError('Error creating version', error)
      return null
    }
  }

  /**
   * Update a draft version
   * Handles json-fallback by saving directly to JSON files
   */
  async updateVersion(versionId: string, updates: UpdateVersionRequest): Promise<RoutineVersion | null> {
    // Handle JSON fallback version - save directly to files
    if (versionId === 'json-fallback') {
      try {
        const routine = await this.fitnessService.getRoutine()
        if (!routine) return null

        // Update routine
        if (updates.name !== undefined) routine.name = updates.name
        if (updates.userProfile !== undefined) routine.userProfile = updates.userProfile
        if (updates.injuryProtocol !== undefined) routine.injuryProtocol = updates.injuryProtocol
        if (updates.schedule !== undefined) routine.schedule = updates.schedule
        if (updates.dailyRoutines !== undefined) {
          routine.dailyRoutines = {
            morning: updates.dailyRoutines.morning ?? routine.dailyRoutines.morning,
            night: updates.dailyRoutines.night ?? routine.dailyRoutines.night,
          }
        }

        await this.fitnessService.updateRoutine(routine)

        // Update workout definitions if provided
        if (updates.workoutDefinitions !== undefined) {
          const currentDefs = await this.fitnessService.getWorkoutDefinitions()
          const updatedDefs = { ...currentDefs, ...updates.workoutDefinitions }
          await this.fitnessService.updateWorkoutDefinitions(updatedDefs)
        }

        // Return updated version
        return this.getVersion('json-fallback')
      } catch (error) {
        this.logError('Error updating JSON fallback version', error)
        return null
      }
    }

    // Supabase path
    if (!this.isSupabaseAvailable()) {
      return null
    }

    const client = this.getWriteClient()
    if (!client) return null

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      // First get the existing version to check if it's a draft
      const existing = await this.getVersion(versionId)
      if (!existing || !existing.isDraft) {
        return null // Can only update drafts
      }

      // Build update object
      const updateData: Partial<FitnessRoutineVersionInsert> = {
        updated_at: getCurrentTimestamp(),
      }

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.changeSummary !== undefined) updateData.change_summary = updates.changeSummary
      if (updates.userProfile !== undefined) updateData.user_profile = updates.userProfile
      if (updates.injuryProtocol !== undefined) updateData.injury_protocol = updates.injuryProtocol
      if (updates.schedule !== undefined) updateData.schedule = updates.schedule
      if (updates.dailyRoutines !== undefined) {
        updateData.daily_routines = {
          morning: updates.dailyRoutines.morning ?? existing.dailyRoutines.morning,
          night: updates.dailyRoutines.night ?? existing.dailyRoutines.night,
        }
      }
      if (updates.workoutDefinitions !== undefined) {
        updateData.workout_definitions = {
          ...existing.workoutDefinitions,
          ...updates.workoutDefinitions,
        }
      }

      const { data, error } = await clientAny
        .from('fitness_routine_versions')
        .update(updateData)
        .eq('id', versionId)
        .select()
        .single()

      if (error) throw error

      return this.rowToVersion(data as FitnessRoutineVersionRow)
    } catch (error) {
      this.logError('Error updating version', error)
      return null
    }
  }

  /**
   * Activate a version
   */
  async activateVersion(versionId: string): Promise<RoutineVersion | null> {
    if (!this.isSupabaseAvailable()) {
      return null
    }

    const client = this.getWriteClient()
    if (!client) return null

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      // Get the version to activate
      const version = await this.getVersion(versionId)
      if (!version) return null

      // Update to active (trigger will deactivate others)
      const { data, error } = await clientAny
        .from('fitness_routine_versions')
        .update({
          is_active: true,
          is_draft: false,
          activated_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
        })
        .eq('id', versionId)
        .select()
        .single()

      if (error) throw error

      // Sync to JSON files and main routine table
      const activatedVersion = this.rowToVersion(data as FitnessRoutineVersionRow)
      await this.syncVersionToFiles(activatedVersion)
      await this.syncVersionToRoutineTable(activatedVersion)

      return activatedVersion
    } catch (error) {
      this.logError('Error activating version', error)
      return null
    }
  }

  /**
   * Delete a draft version
   */
  async deleteVersion(versionId: string): Promise<boolean> {
    if (!this.isSupabaseAvailable()) {
      return false
    }

    const client = this.getWriteClient()
    if (!client) return false

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      // First check if it's a draft (only drafts can be deleted)
      const version = await this.getVersion(versionId)
      if (!version || !version.isDraft) {
        return false
      }

      const { error } = await clientAny
        .from('fitness_routine_versions')
        .delete()
        .eq('id', versionId)

      return !error
    } catch (error) {
      this.logError('Error deleting version', error)
      return false
    }
  }

  /**
   * Clean up duplicate/orphaned versions
   * Keeps the active version and optionally the newest draft if it's newer
   * Returns summary of what was cleaned up
   */
  async cleanupVersions(routineId: string): Promise<{
    kept: { active?: string; draft?: string }
    deleted: number
    versions: { id: string; versionNumber: number; status: string }[]
  }> {
    if (!this.isSupabaseAvailable()) {
      return { kept: {}, deleted: 0, versions: [] }
    }

    const client = this.getWriteClient()
    if (!client) {
      return { kept: {}, deleted: 0, versions: [] }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      // Get all versions sorted by version_number descending
      const { data: allVersions, error: fetchError } = await clientAny
        .from('fitness_routine_versions')
        .select('id, version_number, is_active, is_draft, name')
        .eq('routine_id', routineId)
        .order('version_number', { ascending: false })

      if (fetchError || !allVersions) {
        throw fetchError || new Error('Failed to fetch versions')
      }

      // Find active version
      const activeVersion = allVersions.find((v: { is_active: boolean }) => v.is_active)

      // Find newest draft that's newer than active (or any draft if no active)
      const activeVersionNum = activeVersion?.version_number ?? 0
      const newerDrafts = allVersions.filter((v: { is_draft: boolean; version_number: number }) =>
        v.is_draft && v.version_number > activeVersionNum
      )
      const newestDraft = newerDrafts[0] // Already sorted desc

      // Determine what to keep
      const keepIds = new Set<string>()
      if (activeVersion) keepIds.add(activeVersion.id)
      if (newestDraft) keepIds.add(newestDraft.id)

      // If nothing to keep, keep the newest version
      if (keepIds.size === 0 && allVersions.length > 0) {
        keepIds.add(allVersions[0].id)
      }

      // Delete everything else
      const toDelete = allVersions.filter((v: { id: string }) => !keepIds.has(v.id))

      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((v: { id: string }) => v.id)
        const { error: deleteError } = await clientAny
          .from('fitness_routine_versions')
          .delete()
          .in('id', deleteIds)

        if (deleteError) {
          this.logError('Error deleting versions during cleanup', deleteError)
        }
      }

      // Return summary
      const keptVersions = allVersions.filter((v: { id: string }) => keepIds.has(v.id))
      return {
        kept: {
          active: activeVersion?.id,
          draft: newestDraft?.id,
        },
        deleted: toDelete.length,
        versions: keptVersions.map((v: { id: string; version_number: number; is_active: boolean; is_draft: boolean }) => ({
          id: v.id,
          versionNumber: v.version_number,
          status: v.is_active ? 'active' : v.is_draft ? 'draft' : 'inactive',
        })),
      }
    } catch (error) {
      this.logError('Error cleaning up versions', error)
      return { kept: {}, deleted: 0, versions: [] }
    }
  }

  // ==========================================
  // Workout Definitions Methods
  // ==========================================

  /**
   * Get workout definitions for a routine
   */
  async getWorkoutDefinitions(routineId: string): Promise<Record<DayOfWeek, Workout>> {
    // First try to get from active version in Supabase
    if (this.isSupabaseAvailable()) {
      const client = this.getReadClient()
      if (client) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clientAny = client as any

          const { data, error } = await clientAny
            .from('fitness_routine_versions')
            .select('workout_definitions')
            .eq('routine_id', routineId)
            .eq('is_active', true)
            .single()

          if (!error && data?.workout_definitions) {
            return data.workout_definitions as Record<DayOfWeek, Workout>
          }
        } catch {
          // Fall back to JSON files
        }
      }
    }

    // Fall back to JSON files
    return this.fitnessService.getWorkoutDefinitions()
  }

  /**
   * Update all workout definitions for a routine
   */
  async updateWorkoutDefinitions(
    routineId: string,
    definitions: Record<DayOfWeek, Workout>
  ): Promise<Record<DayOfWeek, Workout>> {
    // Update JSON file
    await this.fitnessService.updateWorkoutDefinitions(definitions)

    // Update active version if Supabase is available
    if (this.isSupabaseAvailable()) {
      const client = this.getWriteClient()
      if (client) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clientAny = client as any

          await clientAny
            .from('fitness_routine_versions')
            .update({
              workout_definitions: definitions,
              updated_at: getCurrentTimestamp(),
            })
            .eq('routine_id', routineId)
            .eq('is_active', true)
        } catch (error) {
          this.logError('Error updating workout definitions in Supabase', error)
        }
      }
    }

    return definitions
  }

  /**
   * Update workout definition for a specific day
   */
  async updateWorkoutDefinition(
    routineId: string,
    day: DayOfWeek,
    workout: Workout
  ): Promise<Workout> {
    const definitions = await this.getWorkoutDefinitions(routineId)
    definitions[day] = workout
    await this.updateWorkoutDefinitions(routineId, definitions)
    return workout
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Convert database row to RoutineVersion
   */
  private rowToVersion(row: FitnessRoutineVersionRow): RoutineVersion {
    return {
      id: row.id,
      routineId: row.routine_id,
      versionNumber: row.version_number,
      name: row.name,
      changeSummary: row.change_summary ?? undefined,
      userProfile: row.user_profile,
      injuryProtocol: row.injury_protocol ?? undefined,
      schedule: row.schedule,
      dailyRoutines: row.daily_routines,
      workoutDefinitions: row.workout_definitions,
      isActive: row.is_active,
      isDraft: row.is_draft,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      activatedAt: row.activated_at ?? undefined,
    }
  }

  /**
   * Sync activated version to JSON files
   */
  private async syncVersionToFiles(version: RoutineVersion): Promise<void> {
    try {
      // Update routine file
      const routine = await this.fitnessService.getRoutine()
      if (routine) {
        routine.name = version.name
        routine.userProfile = version.userProfile
        routine.injuryProtocol = version.injuryProtocol ?? routine.injuryProtocol
        routine.schedule = version.schedule
        routine.dailyRoutines = version.dailyRoutines
        await this.fitnessService.updateRoutine(routine)
      }

      // Update workout definitions file
      await this.fitnessService.updateWorkoutDefinitions(version.workoutDefinitions)
    } catch (error) {
      this.logError('Error syncing version to files', error)
    }
  }

  /**
   * Sync activated version to fitness_routines table
   */
  private async syncVersionToRoutineTable(version: RoutineVersion): Promise<void> {
    if (!this.isSupabaseAvailable()) return

    const client = this.getWriteClient()
    if (!client) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

      await clientAny
        .from('fitness_routines')
        .upsert({
          id: version.routineId,
          name: version.name,
          user_profile: version.userProfile,
          injury_protocol: version.injuryProtocol,
          schedule: version.schedule,
          daily_routines: version.dailyRoutines,
          updated_at: getCurrentTimestamp(),
        }, { onConflict: 'id' })
    } catch (error) {
      this.logError('Error syncing version to routine table', error)
    }
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
