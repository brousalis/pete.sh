/**
 * Maple Service
 * Handles dog walk tracking data storage and retrieval
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
    AvailableWalkingWorkout,
    CreateMapleWalkInput,
    ListMapleWalksOptions,
    MapleLinkedWorkout,
    MapleStats,
    MapleWalk,
    MapleWalkRoute,
    MapleWalkRow,
    MapleWalkWithDetails,
    UpdateMapleWalkInput,
} from '@/lib/types/maple.types'

// ============================================
// SERVICE CLASS
// ============================================

class MapleService {
  // ============================================
  // WALK CRUD OPERATIONS
  // ============================================

  /**
   * Get all maple walks with optional filtering
   */
  async getWalks(options: ListMapleWalksOptions = {}): Promise<MapleWalk[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    const { limit = 50, offset = 0, startDate, endDate, moodRating } = options

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('maple_walks')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    if (moodRating) {
      query = query.eq('mood_rating', moodRating)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching maple walks:', error)
      return []
    }

    return (data as MapleWalkRow[]).map((row) => this.mapRowToWalk(row))
  }

  /**
   * Get a single maple walk by ID
   */
  async getWalk(id: string): Promise<MapleWalk | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('maple_walks')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Error fetching maple walk:', error)
      return null
    }

    return this.mapRowToWalk(data as MapleWalkRow)
  }

  /**
   * Get a maple walk with full details (workout, route, samples)
   */
  async getWalkWithDetails(id: string): Promise<MapleWalkWithDetails | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Get the walk
    const { data: walkData, error: walkError } = await db
      .from('maple_walks')
      .select('*')
      .eq('id', id)
      .single()

    if (walkError || !walkData) {
      console.error('Error fetching maple walk:', walkError)
      return null
    }

    const walk = this.mapRowToWalk(walkData as MapleWalkRow)
    let workout: MapleLinkedWorkout | null = null
    let route: MapleWalkRoute | null = null
    let hrSamples: Array<{ timestamp: string; bpm: number }> = []

    // Get linked workout if exists
    if (walk.healthkitWorkoutId) {
      const { data: workoutData, error: workoutError } = await db
        .from('apple_health_workouts')
        .select('*')
        .eq('id', walk.healthkitWorkoutId)
        .single()

      if (!workoutError && workoutData) {
        workout = {
          id: workoutData.id,
          healthkitId: workoutData.healthkit_id,
          startDate: workoutData.start_date,
          endDate: workoutData.end_date,
          duration: workoutData.duration,
          activeCalories: workoutData.active_calories,
          totalCalories: workoutData.total_calories,
          distanceMeters: workoutData.distance_meters,
          distanceMiles: workoutData.distance_miles,
          elevationGainMeters: workoutData.elevation_gain_meters,
          hrAverage: workoutData.hr_average,
          hrMin: workoutData.hr_min,
          hrMax: workoutData.hr_max,
          hrZones: workoutData.hr_zones,
          paceAverage: workoutData.pace_average,
          source: workoutData.source,
        }

        // Get route data
        const { data: routeData, error: routeError } = await db
          .from('apple_health_routes')
          .select('*')
          .eq('workout_id', walk.healthkitWorkoutId)
          .single()

        if (!routeError && routeData) {
          route = {
            samples: routeData.samples || [],
            totalDistance: routeData.total_distance_meters || 0,
            totalElevationGain: routeData.total_elevation_gain || 0,
            totalElevationLoss: routeData.total_elevation_loss || 0,
          }
        }

        // Get HR samples for chart
        const { data: hrData, error: hrError } = await db
          .from('apple_health_hr_samples')
          .select('timestamp, bpm')
          .eq('workout_id', walk.healthkitWorkoutId)
          .order('timestamp', { ascending: true })

        if (!hrError && hrData) {
          // Downsample for performance (every 10th sample for chart)
          hrSamples = (hrData as Array<{ timestamp: string; bpm: number }>).filter(
            (_, i) => i % 10 === 0
          )
        }
      }
    }

    return {
      ...walk,
      workout,
      route,
      hrSamples,
    }
  }

  /**
   * Create a new maple walk
   */
  async createWalk(input: CreateMapleWalkInput): Promise<MapleWalk | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Get workout data to cache date, duration, distance
    const { data: workoutData, error: workoutError } = await db
      .from('apple_health_workouts')
      .select('start_date, duration, distance_miles')
      .eq('id', input.healthkitWorkoutId)
      .single()

    if (workoutError || !workoutData) {
      console.error('Error fetching workout for maple walk:', workoutError)
      return null
    }

    const walkDate = new Date(workoutData.start_date).toISOString().split('T')[0]

    const { data, error } = await db
      .from('maple_walks')
      .insert({
        healthkit_workout_id: input.healthkitWorkoutId,
        title: input.title || null,
        mood_rating: input.moodRating || null,
        notes: input.notes || null,
        date: walkDate,
        duration: workoutData.duration,
        distance_miles: workoutData.distance_miles,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating maple walk:', error)
      return null
    }

    return this.mapRowToWalk(data as MapleWalkRow)
  }

  /**
   * Update a maple walk
   */
  async updateWalk(id: string, input: UpdateMapleWalkInput): Promise<MapleWalk | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const updateData: Record<string, unknown> = {}

    if ('title' in input) updateData.title = input.title
    if ('moodRating' in input) updateData.mood_rating = input.moodRating
    if ('notes' in input) updateData.notes = input.notes

    const { data, error } = await db
      .from('maple_walks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating maple walk:', error)
      return null
    }

    return this.mapRowToWalk(data as MapleWalkRow)
  }

  /**
   * Delete a maple walk
   */
  async deleteWalk(id: string): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('maple_walks').delete().eq('id', id)

    if (error) {
      console.error('Error deleting maple walk:', error)
      return false
    }

    return true
  }

  // ============================================
  // AVAILABLE WORKOUTS
  // ============================================

  /**
   * Get walking workouts not yet linked to maple walks
   */
  async getAvailableWorkouts(limit: number = 20): Promise<AvailableWalkingWorkout[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Get all walking workouts
    const { data: workouts, error: workoutsError } = await db
      .from('apple_health_workouts')
      .select('id, healthkit_id, start_date, end_date, duration, distance_miles, active_calories, hr_average, hr_max')
      .eq('workout_type', 'walking')
      .order('start_date', { ascending: false })
      .limit(limit * 2) // Get more to filter out linked ones

    if (workoutsError || !workouts) {
      console.error('Error fetching available workouts:', workoutsError)
      return []
    }

    // Get linked workout IDs
    const { data: linkedWalks, error: linkedError } = await db
      .from('maple_walks')
      .select('healthkit_workout_id')
      .not('healthkit_workout_id', 'is', null)

    if (linkedError) {
      console.error('Error fetching linked walks:', linkedError)
    }

    const linkedIds = new Set((linkedWalks || []).map((w: { healthkit_workout_id: string }) => w.healthkit_workout_id))

    // Filter out linked workouts
    const availableWorkouts = (workouts as Array<{
      id: string
      healthkit_id: string
      start_date: string
      end_date: string
      duration: number
      distance_miles: number | null
      active_calories: number
      hr_average: number | null
      hr_max: number | null
    }>)
      .filter((w) => !linkedIds.has(w.id))
      .slice(0, limit)
      .map((w) => ({
        id: w.id,
        healthkitId: w.healthkit_id,
        startDate: w.start_date,
        endDate: w.end_date,
        duration: w.duration,
        distanceMiles: w.distance_miles,
        activeCalories: w.active_calories,
        hrAverage: w.hr_average,
        hrMax: w.hr_max,
      }))

    return availableWorkouts
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get maple walk statistics
   */
  async getStats(): Promise<MapleStats> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return this.getEmptyStats()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Try to use the database function first
    const { data: statsData, error: statsError } = await db.rpc('get_maple_walk_stats')

    if (!statsError && statsData && statsData.length > 0) {
      const stats = statsData[0]
      return {
        totalWalks: Number(stats.total_walks) || 0,
        totalDistanceMiles: Number(stats.total_distance_miles) || 0,
        totalDurationMinutes: Number(stats.total_duration_minutes) || 0,
        avgDistanceMiles: Number(stats.avg_distance_miles) || 0,
        avgDurationMinutes: Number(stats.avg_duration_minutes) || 0,
        moodBreakdown: {
          happy: Number(stats.happy_count) || 0,
          neutral: Number(stats.neutral_count) || 0,
          sad: Number(stats.sad_count) || 0,
        },
        thisWeekWalks: Number(stats.this_week_walks) || 0,
        thisMonthWalks: Number(stats.this_month_walks) || 0,
      }
    }

    // Fallback: calculate manually
    const { data: walks, error: walksError } = await db.from('maple_walks').select('*')

    if (walksError || !walks) {
      return this.getEmptyStats()
    }

    const walksList = walks as MapleWalkRow[]
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalDistance = walksList.reduce((sum, w) => sum + (Number(w.distance_miles) || 0), 0)
    const totalDuration = walksList.reduce((sum, w) => sum + (w.duration || 0), 0)

    return {
      totalWalks: walksList.length,
      totalDistanceMiles: totalDistance,
      totalDurationMinutes: totalDuration / 60,
      avgDistanceMiles: walksList.length > 0 ? totalDistance / walksList.length : 0,
      avgDurationMinutes: walksList.length > 0 ? totalDuration / 60 / walksList.length : 0,
      moodBreakdown: {
        happy: walksList.filter((w) => w.mood_rating === 'happy').length,
        neutral: walksList.filter((w) => w.mood_rating === 'neutral').length,
        sad: walksList.filter((w) => w.mood_rating === 'sad').length,
      },
      thisWeekWalks: walksList.filter((w) => new Date(w.date) >= weekStart).length,
      thisMonthWalks: walksList.filter((w) => new Date(w.date) >= monthStart).length,
    }
  }

  // ============================================
  // ROUTE DATA
  // ============================================

  /**
   * Get route data for a walk
   */
  async getWalkRoute(walkId: string): Promise<MapleWalkRoute | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // First get the walk to find the workout ID
    const { data: walk, error: walkError } = await db
      .from('maple_walks')
      .select('healthkit_workout_id')
      .eq('id', walkId)
      .single()

    if (walkError || !walk || !walk.healthkit_workout_id) {
      return null
    }

    // Get route data
    const { data: routeData, error: routeError } = await db
      .from('apple_health_routes')
      .select('*')
      .eq('workout_id', walk.healthkit_workout_id)
      .single()

    if (routeError || !routeData) {
      return null
    }

    return {
      samples: routeData.samples || [],
      totalDistance: routeData.total_distance_meters || 0,
      totalElevationGain: routeData.total_elevation_gain || 0,
      totalElevationLoss: routeData.total_elevation_loss || 0,
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private mapRowToWalk(row: MapleWalkRow): MapleWalk {
    return {
      id: row.id,
      healthkitWorkoutId: row.healthkit_workout_id,
      title: row.title,
      moodRating: row.mood_rating,
      notes: row.notes,
      date: row.date,
      duration: row.duration,
      distanceMiles: row.distance_miles ? Number(row.distance_miles) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private getEmptyStats(): MapleStats {
    return {
      totalWalks: 0,
      totalDistanceMiles: 0,
      totalDurationMinutes: 0,
      avgDistanceMiles: 0,
      avgDurationMinutes: 0,
      moodBreakdown: {
        happy: 0,
        neutral: 0,
        sad: 0,
      },
      thisWeekWalks: 0,
      thisMonthWalks: 0,
    }
  }
}

// Export singleton instance
export const mapleService = new MapleService()
