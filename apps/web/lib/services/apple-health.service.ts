/**
 * Apple Health Service
 * Handles Apple Watch health data storage and retrieval
 * Used by the PeteWatch app to sync workout data
 */

import { workoutAutocompleteService } from '@/lib/services/workout-autocomplete.service'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
    AppleHealthCadenceSampleInsert,
    AppleHealthDailyMetricsInsert,
    AppleHealthHrSampleInsert,
    AppleHealthPaceSampleInsert,
    AppleHealthRouteInsert,
    AppleHealthWorkoutInsert
} from '@/lib/supabase/types'
import type {
    AppleHealthWorkout,
    AppleHealthWorkoutPayload,
    CadenceSample,
    DailyHealthMetrics,
    HeartRateSample,
    HeartRateZone,
    PaceSample,
} from '@/lib/types/apple-health.types'
import type { DayOfWeek } from '@/lib/types/fitness.types'

// ============================================
// DATABASE TYPES (matching Supabase schema)
// ============================================

interface DbWorkout {
  id: string
  healthkit_id: string
  workout_type: string
  workout_type_raw: number | null
  start_date: string
  end_date: string
  duration: number
  active_calories: number
  total_calories: number
  distance_meters: number | null
  distance_miles: number | null
  elevation_gain_meters: number | null
  hr_average: number | null
  hr_min: number | null
  hr_max: number | null
  hr_zones: HeartRateZone[] | null
  cadence_average: number | null
  pace_average: number | null
  pace_best: number | null
  stride_length_avg: number | null
  running_power_avg: number | null
  source: string
  source_version: string | null
  device_name: string | null
  device_model: string | null
  weather_temp_celsius: number | null
  weather_humidity: number | null
  linked_workout_id: string | null
  linked_day: string | null
  linked_week: number | null
  linked_year: number | null
  recorded_at: string
  created_at: string
}

interface DbHrSample {
  id: string
  workout_id: string
  timestamp: string
  bpm: number
  motion_context: string | null
}

interface DbDailyMetrics {
  id: string
  date: string
  steps: number
  active_calories: number
  total_calories: number
  exercise_minutes: number
  stand_hours: number
  move_goal: number | null
  exercise_goal: number | null
  stand_goal: number | null
  resting_heart_rate: number | null
  heart_rate_variability: number | null
  vo2_max: number | null
  sleep_duration: number | null
  sleep_awake: number | null
  sleep_rem: number | null
  sleep_core: number | null
  sleep_deep: number | null
  walking_hr_average: number | null
  walking_double_support_pct: number | null
  walking_asymmetry_pct: number | null
  walking_speed: number | null
  walking_step_length: number | null
  source: string
  recorded_at: string
}

export class AppleHealthService {
  // ============================================
  // WORKOUT OPERATIONS
  // ============================================

  /**
   * Save a workout from Apple Watch
   * This is the main entry point for PeteWatch sync
   */
  async saveWorkout(payload: AppleHealthWorkoutPayload): Promise<{ id: string; success: boolean }> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { workout, linkedWorkoutId, linkedDay } = payload

    // Calculate HR zones if not provided
    const hrZones = workout.heartRate.zones.length > 0
      ? workout.heartRate.zones
      : this.calculateHrZonesFromSamples(workout.heartRateSamples, 185) // Default max HR

    // Get week number and year for linking
    const startDate = new Date(workout.startDate)
    const weekNumber = this.getWeekNumber(startDate)
    const year = startDate.getFullYear()

    // Insert workout - using type assertion for dynamic table
    const workoutInsert: AppleHealthWorkoutInsert = {
      healthkit_id: workout.id,
      workout_type: workout.workoutType,
      workout_type_raw: workout.workoutTypeRaw || null,
      start_date: workout.startDate,
      end_date: workout.endDate,
      duration: workout.duration,
      active_calories: workout.activeCalories,
      total_calories: workout.totalCalories,
      distance_meters: workout.distance || null,
      distance_miles: workout.distanceMiles || null,
      elevation_gain_meters: workout.elevationGain || null,
      hr_average: workout.heartRate.average,
      hr_min: workout.heartRate.min,
      hr_max: workout.heartRate.max,
      hr_zones: hrZones,
      cadence_average: workout.runningMetrics?.cadence.average || null,
      pace_average: workout.runningMetrics?.pace.average || null,
      pace_best: workout.runningMetrics?.pace.best || null,
      stride_length_avg: workout.runningMetrics?.strideLength?.average || null,
      running_power_avg: workout.runningMetrics?.runningPower?.average || null,
      source: workout.source,
      source_version: workout.sourceVersion || null,
      device_name: workout.device?.name || null,
      device_model: workout.device?.model || null,
      weather_temp_celsius: workout.weather?.temperature || null,
      weather_humidity: workout.weather?.humidity || null,
      linked_workout_id: linkedWorkoutId || null,
      linked_day: linkedDay || null,
      linked_week: weekNumber,
      linked_year: year,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workoutData, error: workoutError } = await (supabase as any)
      .from('apple_health_workouts')
      .upsert(workoutInsert, { onConflict: 'healthkit_id' })
      .select('id')
      .single()

    if (workoutError) {
      console.error('Error saving workout:', workoutError)
      throw new Error(`Failed to save workout: ${workoutError.message}`)
    }

    const workoutId = (workoutData as { id: string })?.id
    if (!workoutId) {
      throw new Error('Failed to get workout ID after insert')
    }

    // Save HR samples (batch insert)
    if (workout.heartRateSamples.length > 0) {
      await this.saveHrSamples(workoutId, workout.heartRateSamples)
    }

    // Save cadence samples if available
    if (workout.runningMetrics?.cadence.samples.length) {
      await this.saveCadenceSamples(workoutId, workout.runningMetrics.cadence.samples)
    }

    // Save pace samples if available
    if (workout.runningMetrics?.pace.samples.length) {
      await this.savePaceSamples(workoutId, workout.runningMetrics.pace.samples)
    }

    // Save route if available
    if (workout.route) {
      await this.saveRoute(workoutId, workout.route)
    }

    // Trigger workout autocomplete if linked to a day
    if (linkedDay) {
      try {
        const autocompleteResult = await workoutAutocompleteService.triggerAutocomplete({
          healthkitWorkoutId: workoutId,
          workoutType: workout.workoutType,
          linkedDay: linkedDay as DayOfWeek,
          weekNumber,
          year,
          duration: workout.duration,
        })

        if (autocompleteResult.success && autocompleteResult.exercisesCompleted.length > 0) {
          console.log(
            `[AppleHealth] Auto-completed ${autocompleteResult.exercisesCompleted.length} exercises ` +
            `in sections: ${autocompleteResult.sectionsCompleted.join(', ')}`
          )
        }
      } catch (error) {
        // Log but don't fail the workout save if autocomplete fails
        console.error('[AppleHealth] Autocomplete failed (non-fatal):', error)
      }
    }

    return { id: workoutId, success: true }
  }

  /**
   * Save HR samples for a workout
   */
  private async saveHrSamples(workoutId: string, samples: HeartRateSample[]): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Delete existing samples for this workout (in case of re-sync)
    await db
      .from('apple_health_hr_samples')
      .delete()
      .eq('workout_id', workoutId)

    // Batch insert (Supabase handles batching)
    const hrRecords: AppleHealthHrSampleInsert[] = samples.map(sample => ({
      workout_id: workoutId,
      timestamp: sample.timestamp,
      bpm: sample.bpm,
      motion_context: sample.motionContext || null,
    }))

    // Insert in chunks of 1000 to avoid payload limits
    const chunkSize = 1000
    for (let i = 0; i < hrRecords.length; i += chunkSize) {
      const chunk = hrRecords.slice(i, i + chunkSize)
      const { error } = await db
        .from('apple_health_hr_samples')
        .insert(chunk)

      if (error) {
        console.error('Error saving HR samples:', error)
      }
    }
  }

  /**
   * Save cadence samples for a workout
   */
  private async saveCadenceSamples(workoutId: string, samples: CadenceSample[]): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_cadence_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records: AppleHealthCadenceSampleInsert[] = samples.map(sample => ({
      workout_id: workoutId,
      timestamp: sample.timestamp,
      steps_per_minute: sample.stepsPerMinute,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_cadence_samples').insert(chunk)
    }
  }

  /**
   * Save pace samples for a workout
   */
  private async savePaceSamples(workoutId: string, samples: PaceSample[]): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_pace_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records: AppleHealthPaceSampleInsert[] = samples.map(sample => ({
      workout_id: workoutId,
      timestamp: sample.timestamp,
      minutes_per_mile: sample.minutesPerMile,
      speed_mph: sample.speedMph || null,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_pace_samples').insert(chunk)
    }
  }

  /**
   * Save route data for a workout
   */
  private async saveRoute(workoutId: string, route: AppleHealthWorkout['route']): Promise<void> {
    if (!route) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_routes')
      .delete()
      .eq('workout_id', workoutId)

    const routeInsert: AppleHealthRouteInsert = {
      workout_id: workoutId,
      total_distance_meters: route.totalDistance,
      total_elevation_gain: route.totalElevationGain,
      total_elevation_loss: route.totalElevationLoss,
      samples: route.samples,
    }

    await db.from('apple_health_routes').insert(routeInsert)
  }

  /**
   * Get recent workouts
   * @param workoutType - Filter by workout type
   * @param limit - Max number of workouts to return
   * @param date - Filter to specific date (YYYY-MM-DD format)
   */
  async getRecentWorkouts(
    workoutType?: string,
    limit: number = 10,
    date?: string
  ): Promise<DbWorkout[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    let query = db
      .from('apple_health_workouts')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(limit)

    if (workoutType) {
      query = query.eq('workout_type', workoutType)
    }

    // Filter by specific date if provided
    if (date) {
      // Get start and end of the day in ISO format
      const startOfDay = `${date}T00:00:00.000Z`
      const endOfDay = `${date}T23:59:59.999Z`
      query = query.gte('start_date', startOfDay).lte('start_date', endOfDay)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching workouts:', error)
      return []
    }

    return (data as DbWorkout[]) || []
  }

  /**
   * Get a single workout with all details
   */
  async getWorkout(workoutId: string): Promise<{
    workout: DbWorkout
    hrSamples: DbHrSample[]
    cadenceSamples: { timestamp: string; steps_per_minute: number }[]
    paceSamples: { timestamp: string; minutes_per_mile: number }[]
  } | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Fetch workout
    const { data: workout, error: workoutError } = await db
      .from('apple_health_workouts')
      .select('*')
      .eq('id', workoutId)
      .single()

    if (workoutError || !workout) {
      return null
    }

    // Fetch samples in parallel
    const [hrResult, cadenceResult, paceResult] = await Promise.all([
      db
        .from('apple_health_hr_samples')
        .select('*')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
      db
        .from('apple_health_cadence_samples')
        .select('timestamp, steps_per_minute')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
      db
        .from('apple_health_pace_samples')
        .select('timestamp, minutes_per_mile')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
    ])

    return {
      workout: workout as DbWorkout,
      hrSamples: (hrResult.data as DbHrSample[]) || [],
      cadenceSamples: (cadenceResult.data as { timestamp: string; steps_per_minute: number }[]) || [],
      paceSamples: (paceResult.data as { timestamp: string; minutes_per_mile: number }[]) || [],
    }
  }

  /**
   * Get workout HR samples (downsampled for charts)
   */
  async getWorkoutHrChart(
    workoutId: string,
    sampleInterval: number = 30
  ): Promise<{ timestamp: string; bpm: number }[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('apple_health_hr_samples')
      .select('timestamp, bpm')
      .eq('workout_id', workoutId)
      .order('timestamp', { ascending: true })

    if (error || !data) return []

    // Downsample for chart display
    const samples = data as { timestamp: string; bpm: number }[]
    const interval = Math.ceil(sampleInterval / 5) // Assuming ~5 sec samples
    return samples.filter((_, index) => index % interval === 0)
  }

  // ============================================
  // DAILY METRICS OPERATIONS
  // ============================================

  /**
   * Save daily health metrics
   */
  async saveDailyMetrics(metrics: DailyHealthMetrics): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const metricsInsert: AppleHealthDailyMetricsInsert = {
      date: metrics.date,
      steps: metrics.steps,
      active_calories: metrics.activeCalories,
      total_calories: metrics.totalCalories,
      exercise_minutes: metrics.exerciseMinutes,
      stand_hours: metrics.standHours,
      move_goal: metrics.moveGoal || null,
      exercise_goal: metrics.exerciseGoal || null,
      stand_goal: metrics.standGoal || null,
      resting_heart_rate: metrics.restingHeartRate || null,
      heart_rate_variability: metrics.heartRateVariability || null,
      vo2_max: metrics.vo2Max || null,
      sleep_duration: metrics.sleepDuration || null,
      sleep_awake: metrics.sleepStages?.awake || null,
      sleep_rem: metrics.sleepStages?.rem || null,
      sleep_core: metrics.sleepStages?.core || null,
      sleep_deep: metrics.sleepStages?.deep || null,
      walking_hr_average: metrics.walkingHeartRateAverage || null,
      walking_double_support_pct: metrics.walkingDoubleSupportPercentage || null,
      walking_asymmetry_pct: metrics.walkingAsymmetryPercentage || null,
      walking_speed: metrics.walkingSpeed || null,
      walking_step_length: metrics.walkingStepLength || null,
      source: metrics.source,
    }

    const { error } = await db
      .from('apple_health_daily_metrics')
      .upsert(metricsInsert, { onConflict: 'date' })

    if (error) {
      console.error('Error saving daily metrics:', error)
      return false
    }

    return true
  }

  /**
   * Get daily metrics for a date range
   */
  async getDailyMetrics(daysBack: number = 7): Promise<DbDailyMetrics[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const { data, error } = await db
      .from('apple_health_daily_metrics')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching daily metrics:', error)
      return []
    }

    return (data as DbDailyMetrics[]) || []
  }

  /**
   * Get today's metrics
   */
  async getTodayMetrics(): Promise<DbDailyMetrics | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await db
      .from('apple_health_daily_metrics')
      .select('*')
      .eq('date', today)
      .single()

    if (error) return null
    return data as DbDailyMetrics
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get weekly training summary
   */
  async getWeeklySummary(weeksBack: number = 4): Promise<{
    weekStart: string
    totalWorkouts: number
    totalDurationMin: number
    totalCalories: number
    totalDistanceMiles: number
    avgHr: number
    workoutTypes: Record<string, number>
  }[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeksBack * 7))

    const { data, error } = await db
      .from('apple_health_workouts')
      .select('start_date, duration, total_calories, distance_miles, hr_average, workout_type')
      .gte('start_date', startDate.toISOString())
      .order('start_date', { ascending: false })

    if (error || !data) return []

    // Type the partial select result
    type WorkoutSummaryRow = {
      start_date: string
      duration: number
      total_calories: number
      distance_miles: number | null
      hr_average: number | null
      workout_type: string
    }

    const workouts = data as WorkoutSummaryRow[]

    // Group by week
    const weeklyData = new Map<string, {
      totalWorkouts: number
      totalDuration: number
      totalCalories: number
      totalDistance: number
      hrSum: number
      hrCount: number
      workoutTypes: Record<string, number>
    }>()

    workouts.forEach(workout => {
      const date = new Date(workout.start_date)
      const weekStart = this.getWeekStartDate(date).toISOString().split('T')[0] as string

      if (!weeklyData.has(weekStart)) {
        weeklyData.set(weekStart, {
          totalWorkouts: 0,
          totalDuration: 0,
          totalCalories: 0,
          totalDistance: 0,
          hrSum: 0,
          hrCount: 0,
          workoutTypes: {},
        })
      }

      const week = weeklyData.get(weekStart)!
      week.totalWorkouts++
      week.totalDuration += workout.duration
      week.totalCalories += Number(workout.total_calories)
      week.totalDistance += Number(workout.distance_miles || 0)
      if (workout.hr_average) {
        week.hrSum += workout.hr_average
        week.hrCount++
      }
      week.workoutTypes[workout.workout_type] = (week.workoutTypes[workout.workout_type] || 0) + 1
    })

    return Array.from(weeklyData.entries()).map(([weekStart, weekData]) => ({
      weekStart,
      totalWorkouts: weekData.totalWorkouts,
      totalDurationMin: Math.round(weekData.totalDuration / 60),
      totalCalories: Math.round(weekData.totalCalories),
      totalDistanceMiles: Math.round(weekData.totalDistance * 10) / 10,
      avgHr: weekData.hrCount > 0 ? Math.round(weekData.hrSum / weekData.hrCount) : 0,
      workoutTypes: weekData.workoutTypes,
    }))
  }

  /**
   * Get HR trends over time
   */
  async getHrTrends(daysBack: number = 30): Promise<{
    date: string
    restingHr: number | null
    avgWorkoutHr: number | null
  }[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get resting HR from daily metrics
    const { data: dailyData } = await db
      .from('apple_health_daily_metrics')
      .select('date, resting_heart_rate')
      .gte('date', startDateStr)
      .order('date', { ascending: true })

    // Get workout HR averages grouped by day
    const { data: workoutData } = await db
      .from('apple_health_workouts')
      .select('start_date, hr_average')
      .gte('start_date', startDate.toISOString())

    // Type the partial select results
    type DailyHrRow = { date: string; resting_heart_rate: number | null }
    type WorkoutHrRow = { start_date: string; hr_average: number | null }

    const dailyRows = (dailyData as DailyHrRow[]) || []
    const workoutRows = (workoutData as WorkoutHrRow[]) || []

    // Build date map
    const dateMap = new Map<string, { restingHr: number | null; workoutHrs: number[] }>()

    dailyRows.forEach(d => {
      dateMap.set(d.date, {
        restingHr: d.resting_heart_rate,
        workoutHrs: [],
      })
    })

    workoutRows.forEach(w => {
      const date = new Date(w.start_date).toISOString().split('T')[0] as string
      if (!dateMap.has(date)) {
        dateMap.set(date, { restingHr: null, workoutHrs: [] })
      }
      if (w.hr_average) {
        dateMap.get(date)!.workoutHrs.push(w.hr_average)
      }
    })

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hrData]) => ({
        date,
        restingHr: hrData.restingHr,
        avgWorkoutHr: hrData.workoutHrs.length > 0
          ? Math.round(hrData.workoutHrs.reduce((a, b) => a + b, 0) / hrData.workoutHrs.length)
          : null,
      }))
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Calculate HR zones from samples
   */
  private calculateHrZonesFromSamples(samples: HeartRateSample[], maxHr: number): HeartRateZone[] {
    const zones: HeartRateZone[] = [
      { name: 'rest', minBpm: 0, maxBpm: Math.round(maxHr * 0.5), duration: 0, percentage: 0 },
      { name: 'warmup', minBpm: Math.round(maxHr * 0.5), maxBpm: Math.round(maxHr * 0.6), duration: 0, percentage: 0 },
      { name: 'fatBurn', minBpm: Math.round(maxHr * 0.6), maxBpm: Math.round(maxHr * 0.7), duration: 0, percentage: 0 },
      { name: 'cardio', minBpm: Math.round(maxHr * 0.7), maxBpm: Math.round(maxHr * 0.85), duration: 0, percentage: 0 },
      { name: 'peak', minBpm: Math.round(maxHr * 0.85), maxBpm: maxHr, duration: 0, percentage: 0 },
    ]

    // Estimate time between samples (assume ~5 seconds)
    const sampleInterval = 5 // seconds

    samples.forEach(sample => {
      const zone = zones.find(z => sample.bpm >= z.minBpm && sample.bpm < z.maxBpm)
        ?? zones[zones.length - 1] // Default to peak if above max
      if (zone) {
        zone.duration += sampleInterval
      }
    })

    const totalDuration = zones.reduce((sum, z) => sum + z.duration, 0)
    zones.forEach(zone => {
      zone.percentage = totalDuration > 0 ? Math.round((zone.duration / totalDuration) * 100) : 0
    })

    return zones
  }

  /**
   * Get week number from date
   */
  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  /**
   * Get start of week (Monday)
   */
  private getWeekStartDate(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
    return new Date(d.setDate(diff))
  }
}

// Export singleton instance
export const appleHealthService = new AppleHealthService()
