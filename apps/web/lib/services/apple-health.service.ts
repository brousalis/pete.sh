/**
 * Apple Health Service
 * Handles Apple Watch health data storage and retrieval
 * Used by the PeteWatch app to sync workout data
 */

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
    AppleWorkoutType,
    CadenceSample,
    DailyHealthMetrics,
    HeartRateSample,
    HeartRateZone,
    HrvSample,
    PaceSample,
} from '@/lib/types/apple-health.types'
import { APPLE_WORKOUT_TYPE_MAP } from '@/lib/types/apple-health.types'

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
  ground_contact_time_avg: number | null
  vertical_oscillation_avg: number | null
  cycling_avg_speed: number | null
  cycling_max_speed: number | null
  cycling_avg_cadence: number | null
  cycling_avg_power: number | null
  cycling_max_power: number | null
  effort_score: number | null
  is_indoor: boolean | null
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

interface DbRoute {
  id: string
  workout_id: string
  total_distance_meters: number | null
  total_elevation_gain: number | null
  total_elevation_loss: number | null
  samples: Array<{
    timestamp: string
    latitude: number
    longitude: number
    altitude?: number
    speed?: number
    course?: number
    horizontalAccuracy?: number
    verticalAccuracy?: number
  }> | null
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
  body_mass_lbs: number | null
  body_fat_percentage: number | null
  lean_body_mass_lbs: number | null
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
    workout.workoutType = this.normalizeWorkoutType(workout)

    const routeSamples = workout.route?.samples?.length ?? 0
    const markerCount = workout.bathroomMarkers?.length ?? 0
    console.log(`[AppleHealth] Saving workout ${workout.id.slice(0, 8)} type=${workout.workoutType} source=${workout.source} route=${routeSamples}pts markers=${markerCount}`)

    // Don't let phone ingest overwrite a workout the watch already synced.
    // Accept legacy PeteTrain* sources alongside petehome*.
    const phoneSources = new Set(['petehome-ios', 'PeteTrain-iOS'])
    const watchSources = new Set(['petehome', 'PeteTrain'])
    if (phoneSources.has(workout.source)) {
      const { data: existing } = await (supabase as any)
        .from('apple_health_workouts')
        .select('id, source')
        .eq('healthkit_id', workout.id)
        .single()

      if (existing?.source && watchSources.has(existing.source)) {
        workout.source = existing.source
        console.log(`[AppleHealth] Preserving watch source for workout ${workout.id}`)
      }
    }

    // Calculate HR zones if not provided
    const hrZones = workout.heartRate.zones.length > 0
      ? workout.heartRate.zones
      : this.calculateHrZonesFromSamples(workout.heartRateSamples, 185) // Default max HR

    // Get week number for optional legacy linking columns
    const startDate = new Date(workout.startDate)
    const weekNumber = this.getWeekNumber(startDate)

    // Helper to safely round values for INTEGER columns
    const toInt = (val: number | undefined | null): number | null =>
      val != null && isFinite(val) ? Math.round(val) : null

    // Insert workout - using type assertion for dynamic table
    const workoutInsert: AppleHealthWorkoutInsert = {
      healthkit_id: workout.id,
      workout_type: workout.workoutType,
      workout_type_raw: toInt(workout.workoutTypeRaw),
      start_date: workout.startDate,
      end_date: workout.endDate,
      duration: toInt(workout.duration) ?? 0,
      active_calories: workout.activeCalories,
      total_calories: workout.totalCalories,
      distance_meters: workout.distance || null,
      distance_miles: workout.distanceMiles || null,
      elevation_gain_meters: workout.elevationGain || null,
      hr_average: toInt(workout.heartRate.average),
      hr_min: toInt(workout.heartRate.min),
      hr_max: toInt(workout.heartRate.max),
      hr_zones: hrZones,
      hr_zone_source: workout.heartRate.zoneSource ?? null,
      // Running metrics
      cadence_average: toInt(workout.runningMetrics?.cadence.average),
      pace_average: workout.runningMetrics?.pace.average || null,
      pace_best: workout.runningMetrics?.pace.best || null,
      stride_length_avg: workout.runningMetrics?.strideLength?.average || null,
      running_power_avg: workout.runningMetrics?.runningPower?.average || null,
      ground_contact_time_avg: workout.runningMetrics?.groundContactTime?.average || null,
      vertical_oscillation_avg: workout.runningMetrics?.verticalOscillation?.average || null,
      // Cycling metrics
      cycling_avg_speed: workout.cyclingMetrics?.avgSpeed || null,
      cycling_max_speed: workout.cyclingMetrics?.maxSpeed || null,
      cycling_avg_cadence: toInt(workout.cyclingMetrics?.avgCadence),
      cycling_avg_power: toInt(workout.cyclingMetrics?.avgPower),
      cycling_max_power: toInt(workout.cyclingMetrics?.maxPower),
      // Walking metrics (for Maple walks - walking and 'other' workout types)
      walking_avg_speed: workout.walkingMetrics?.avgSpeed || null,
      walking_avg_step_length: workout.walkingMetrics?.avgStepLength || null,
      walking_double_support_pct: workout.walkingMetrics?.doubleSupportPercentage || null,
      walking_asymmetry_pct: workout.walkingMetrics?.asymmetryPercentage || null,
      walking_step_count: toInt(workout.walkingMetrics?.stepCount),
      // Swimming metrics
      swimming_stroke_count: toInt(workout.swimmingMetrics?.strokeCount),
      swimming_pool_length_meters: workout.swimmingMetrics?.poolLengthMeters || null,
      swimming_location: workout.swimmingMetrics?.swimmingLocation || null,
      // Indoor/outdoor flag
      is_indoor: workout.isIndoor ?? null,
      // Effort score
      effort_score: workout.effortScore || null,
      // Metadata
      source: workout.source,
      source_version: workout.sourceVersion || null,
      device_name: workout.device?.name || null,
      device_model: workout.device?.model || null,
      weather_temp_celsius: workout.weather?.temperature || null,
      weather_humidity: toInt(workout.weather?.humidity),
      linked_workout_id: linkedWorkoutId || null,
      linked_day: linkedDay || null,
      linked_week: weekNumber,
      linked_year: startDate.getFullYear(),
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

    if (workout.activities?.length) {
      await this.saveWorkoutActivities(workoutId, workout.activities)
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
    } else {
      console.log(`[AppleHealth] No route data in payload for workout ${workoutId}`)
    }

    // Save workout events if available
    if (workout.workoutEvents?.length) {
      await this.saveWorkoutEvents(workoutId, workout.workoutEvents)
    }

    // Save cycling samples if available
    if (workout.cyclingMetrics?.speedSamples?.length) {
      await this.saveCyclingSpeedSamples(workoutId, workout.cyclingMetrics.speedSamples)
    }
    if (workout.cyclingMetrics?.cadenceSamples?.length) {
      await this.saveCyclingCadenceSamples(workoutId, workout.cyclingMetrics.cadenceSamples)
    }
    if (workout.cyclingMetrics?.powerSamples?.length) {
      await this.saveCyclingPowerSamples(workoutId, workout.cyclingMetrics.powerSamples)
    }

    // Save mile splits if available
    if (workout.runningMetrics?.splits?.length) {
      await this.saveSplits(workoutId, workout.runningMetrics.splits)
    }

    // Save per-length swim data and roll up SWOLF / pace per 100
    if (workout.swimmingMetrics?.lengths?.length) {
      await this.saveSwimLengths(workoutId, workout.swimmingMetrics)
    }

    // Persist walking samples when present (HealthKit data; no Maple side effects).
    if (workout.walkingMetrics?.speedSamples?.length) {
      await this.saveWalkingSpeedSamples(workoutId, workout.walkingMetrics.speedSamples)
    }
    if (workout.walkingMetrics?.stepLengthSamples?.length) {
      await this.saveWalkingStepLengthSamples(workoutId, workout.walkingMetrics.stepLengthSamples)
    }

    return { id: workoutId, success: true }
  }

  private normalizeWorkoutType(workout: AppleHealthWorkout): AppleWorkoutType {
    const raw = workout.workoutTypeRaw
    if (raw === 82 || workout.workoutType === 'swimBikeRun') return 'swimBikeRun'
    if (raw === 83 || workout.workoutType === 'transition') return 'transition'
    if (workout.workoutType === 'other' && raw != null && APPLE_WORKOUT_TYPE_MAP[raw]) {
      return APPLE_WORKOUT_TYPE_MAP[raw]
    }
    return workout.workoutType
  }

  private async saveWorkoutActivities(
    workoutId: string,
    activities: NonNullable<AppleHealthWorkout['activities']>
  ): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('apple_health_workout_activities').delete().eq('workout_id', workoutId)

    const rows = activities.map((activity) => ({
      workout_id: workoutId,
      healthkit_id: activity.id,
      activity_type: activity.activityType,
      activity_type_raw: activity.activityTypeRaw ?? null,
      start_date: activity.startDate,
      end_date: activity.endDate,
      duration: Math.round(activity.duration),
      distance_meters: activity.distance ?? null,
      active_calories: activity.activeCalories ?? null,
      hr_average: activity.averageHeartRate ?? null,
      hr_zones: activity.zones ?? null,
    }))

    const { error } = await db.from('apple_health_workout_activities').insert(rows)
    if (error) {
      console.error('Error saving workout activities:', error)
    }
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
      bpm: Math.round(sample.bpm),
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
      steps_per_minute: Math.round(sample.stepsPerMinute),
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

    const sampleCount = route.samples?.length ?? 0
    console.log(`[AppleHealth] Saving route for workout ${workoutId}: ${sampleCount} samples, elevGain=${route.totalElevationGain ?? 0}m`)

    const { error: deleteError } = await db
      .from('apple_health_routes')
      .delete()
      .eq('workout_id', workoutId)

    if (deleteError) {
      console.error('[AppleHealth] Error deleting old route:', deleteError)
    }

    const routeInsert: AppleHealthRouteInsert = {
      workout_id: workoutId,
      total_distance_meters: route.totalDistance,
      total_elevation_gain: route.totalElevationGain,
      total_elevation_loss: route.totalElevationLoss,
      samples: route.samples,
    }

    const { error: insertError } = await db.from('apple_health_routes').insert(routeInsert)

    if (insertError) {
      console.error('[AppleHealth] Error saving route:', insertError)
    } else {
      console.log(`[AppleHealth] Route saved: ${sampleCount} samples for workout ${workoutId}`)
    }
  }

  /**
   * Save workout events (pauses, segments, laps)
   */
  private async saveWorkoutEvents(workoutId: string, events: NonNullable<AppleHealthWorkout['workoutEvents']>): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Delete existing events for this workout
    await db
      .from('apple_health_workout_events')
      .delete()
      .eq('workout_id', workoutId)

    const records = events.map(event => ({
      workout_id: workoutId,
      event_type: event.type,
      timestamp: event.timestamp,
      duration: event.duration || null,
      segment_index: event.metadata?.segmentIndex || null,
      lap_number: event.metadata?.lapNumber || null,
      distance_meters: event.metadata?.distance || null,
      split_time: event.metadata?.splitTime || null,
    }))

    await db.from('apple_health_workout_events').insert(records)
  }

  /**
   * Save cycling speed samples
   */
  private async saveCyclingSpeedSamples(workoutId: string, samples: NonNullable<AppleHealthWorkout['cyclingMetrics']>['speedSamples']): Promise<void> {
    if (!samples?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_cycling_speed_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records = samples.map(s => ({
      workout_id: workoutId,
      timestamp: s.timestamp,
      speed_mph: s.speedMph,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_cycling_speed_samples').insert(chunk)
    }
  }

  /**
   * Save cycling cadence samples
   */
  private async saveCyclingCadenceSamples(workoutId: string, samples: NonNullable<AppleHealthWorkout['cyclingMetrics']>['cadenceSamples']): Promise<void> {
    if (!samples?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_cycling_cadence_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records = samples.map(s => ({
      workout_id: workoutId,
      timestamp: s.timestamp,
      rpm: s.rpm,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_cycling_cadence_samples').insert(chunk)
    }
  }

  /**
   * Save cycling power samples
   */
  private async saveCyclingPowerSamples(workoutId: string, samples: NonNullable<AppleHealthWorkout['cyclingMetrics']>['powerSamples']): Promise<void> {
    if (!samples?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_cycling_power_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records = samples.map(s => ({
      workout_id: workoutId,
      timestamp: s.timestamp,
      watts: s.watts,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_cycling_power_samples').insert(chunk)
    }
  }

  /**
   * Save walking speed samples (for Maple walks)
   */
  private async saveWalkingSpeedSamples(workoutId: string, samples: NonNullable<AppleHealthWorkout['walkingMetrics']>['speedSamples']): Promise<void> {
    if (!samples?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_walking_speed_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records = samples.map(s => ({
      workout_id: workoutId,
      timestamp: s.timestamp,
      meters_per_second: s.metersPerSecond,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_walking_speed_samples').insert(chunk)
    }
  }

  /**
   * Save walking step length samples (for Maple walks)
   */
  private async saveWalkingStepLengthSamples(workoutId: string, samples: NonNullable<AppleHealthWorkout['walkingMetrics']>['stepLengthSamples']): Promise<void> {
    if (!samples?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_walking_step_length_samples')
      .delete()
      .eq('workout_id', workoutId)

    const records = samples.map(s => ({
      workout_id: workoutId,
      timestamp: s.timestamp,
      meters: s.meters,
    }))

    const chunkSize = 1000
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      await db.from('apple_health_walking_step_length_samples').insert(chunk)
    }
  }

  /**
   * Save mile/km splits
   */
  private async saveSplits(workoutId: string, splits: NonNullable<AppleHealthWorkout['runningMetrics']>['splits']): Promise<void> {
    if (!splits?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db
      .from('apple_health_splits')
      .delete()
      .eq('workout_id', workoutId)

    const records = splits.map(s => ({
      workout_id: workoutId,
      split_number: Math.round(s.splitNumber),
      split_type: s.splitType,
      distance_meters: s.distanceMeters,
      time_seconds: s.timeSeconds,
      avg_pace: s.avgPace,
      avg_heart_rate: s.avgHeartRate != null ? Math.round(s.avgHeartRate) : null,
      avg_cadence: s.avgCadence != null ? Math.round(s.avgCadence) : null,
      elevation_change: s.elevationChange || null,
    }))

    await db.from('apple_health_splits').insert(records)
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
    cyclingSpeedSamples: { timestamp: string; speed_mph: number }[]
    cyclingCadenceSamples: { timestamp: string; rpm: number }[]
    cyclingPowerSamples: { timestamp: string; watts: number }[]
    workoutEvents: { event_type: string; timestamp: string; duration: number | null; segment_index: number | null; lap_number: number | null }[]
    splits: { split_number: number; split_type: string; distance_meters: number; time_seconds: number; avg_pace: number | null; avg_heart_rate: number | null; avg_cadence: number | null; elevation_change: number | null }[]
    route: DbRoute | null
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

    // Fetch all samples, events, and route in parallel
    const [
      hrResult,
      cadenceResult,
      paceResult,
      cyclingSpeedResult,
      cyclingCadenceResult,
      cyclingPowerResult,
      eventsResult,
      splitsResult,
      routeResult
    ] = await Promise.all([
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
      db
        .from('apple_health_cycling_speed_samples')
        .select('timestamp, speed_mph')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
      db
        .from('apple_health_cycling_cadence_samples')
        .select('timestamp, rpm')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
      db
        .from('apple_health_cycling_power_samples')
        .select('timestamp, watts')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
      db
        .from('apple_health_workout_events')
        .select('event_type, timestamp, duration, segment_index, lap_number')
        .eq('workout_id', workoutId)
        .order('timestamp', { ascending: true }),
      db
        .from('apple_health_splits')
        .select('split_number, split_type, distance_meters, time_seconds, avg_pace, avg_heart_rate, avg_cadence, elevation_change')
        .eq('workout_id', workoutId)
        .order('split_number', { ascending: true }),
      db
        .from('apple_health_routes')
        .select('*')
        .eq('workout_id', workoutId)
        .maybeSingle(),
    ])

    return {
      workout: workout as DbWorkout,
      hrSamples: (hrResult.data as DbHrSample[]) || [],
      cadenceSamples: (cadenceResult.data as { timestamp: string; steps_per_minute: number }[]) || [],
      paceSamples: (paceResult.data as { timestamp: string; minutes_per_mile: number }[]) || [],
      cyclingSpeedSamples: (cyclingSpeedResult.data || []) as { timestamp: string; speed_mph: number }[],
      cyclingCadenceSamples: (cyclingCadenceResult.data || []) as { timestamp: string; rpm: number }[],
      cyclingPowerSamples: (cyclingPowerResult.data || []) as { timestamp: string; watts: number }[],
      workoutEvents: (eventsResult.data || []) as { event_type: string; timestamp: string; duration: number | null; segment_index: number | null; lap_number: number | null }[],
      splits: (splitsResult.data || []) as { split_number: number; split_type: string; distance_meters: number; time_seconds: number; avg_pace: number | null; avg_heart_rate: number | null; avg_cadence: number | null; elevation_change: number | null }[],
      route: (routeResult.data as DbRoute) || null,
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
      hrv_overnight_avg: metrics.hrvOvernightAvg ?? null,
      hrv_morning: metrics.hrvMorning ?? null,
      hrv_sample_count: metrics.hrvSampleCount ?? null,
      hrv_rmssd: metrics.hrvRmssd ?? null,
      hrv_rmssd_overnight_avg: metrics.hrvRmssdOvernightAvg ?? null,
      hrv_rmssd_morning: metrics.hrvRmssdMorning ?? null,
      hrv_rmssd_sample_count: metrics.hrvRmssdSampleCount ?? null,
      vo2_max: metrics.vo2Max || null,
      apple_training_load: metrics.appleTrainingLoad ?? null,
      sleep_duration: metrics.sleepDuration || null,
      sleep_in_bed: metrics.sleepInBed ?? null,
      sleep_start: metrics.sleepStart ?? null,
      sleep_end: metrics.sleepEnd ?? null,
      sleep_awake: metrics.sleepStages?.awake || null,
      sleep_rem: metrics.sleepStages?.rem || null,
      sleep_core: metrics.sleepStages?.core || null,
      sleep_deep: metrics.sleepStages?.deep || null,
      respiratory_rate: metrics.respiratoryRate ?? null,
      wrist_temp_delta: metrics.wristTempDelta ?? null,
      oxygen_saturation: metrics.oxygenSaturation ?? null,
      walking_hr_average: metrics.walkingHeartRateAverage || null,
      walking_double_support_pct: metrics.walkingDoubleSupportPercentage || null,
      walking_asymmetry_pct: metrics.walkingAsymmetryPercentage || null,
      walking_speed: metrics.walkingSpeed || null,
      walking_step_length: metrics.walkingStepLength || null,
      body_mass_lbs: metrics.bodyMassLbs || null,
      body_fat_percentage: metrics.bodyFatPercentage || null,
      lean_body_mass_lbs: metrics.leanBodyMassLbs || null,
      source: metrics.source,
    }

    const { error } = await db
      .from('apple_health_daily_metrics')
      .upsert(metricsInsert, { onConflict: 'date' })

    if (error) {
      console.error('Error saving daily metrics:', error)
      return false
    }

    if (metrics.hrvSamples?.length) {
      await this.saveHrvSamples(metrics.date, metrics.hrvSamples)
    }
    if (metrics.hrvRmssdSamples?.length) {
      await this.saveHrvSamples(metrics.date, metrics.hrvRmssdSamples)
    }

    return true
  }

  /**
   * Persist the raw HRV series so baselines can be recomputed if the readiness
   * algorithm changes, rather than trusting a stored average.
   */
  private async saveHrvSamples(date: string, samples: HrvSample[]): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const rows = samples
      .map((sample) => {
        const metric = sample.metric ?? (sample.rmssdMs != null && sample.sdnnMs == null ? 'rmssd' : 'sdnn')
        const sdnn = sample.sdnnMs
        const rmssd = sample.rmssdMs
        const value = metric === 'rmssd' ? rmssd : sdnn
        if (value == null || !Number.isFinite(value) || value <= 0) return null
        return {
          timestamp: sample.timestamp,
          metric_date: date,
          metric,
          sdnn_ms: sdnn ?? null,
          rmssd_ms: rmssd ?? null,
          context: sample.context ?? null,
          source: sample.source ?? null,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)

    if (rows.length === 0) return

    const { error } = await db
      .from('apple_health_hrv_samples')
      .upsert(rows, { onConflict: 'timestamp,metric', ignoreDuplicates: true })

    if (error) {
      console.error('Error saving HRV samples:', error)
    }
  }

  /**
   * Save per-length swim data and roll it up onto the workout.
   *
   * SWOLF (length seconds + stroke count) separates a technique gain from a
   * fitness gain, which matters more than raw pace while the swim is the
   * biggest available time saving.
   */
  private async saveSwimLengths(
    workoutId: string,
    swimming: NonNullable<AppleHealthWorkout['swimmingMetrics']>
  ): Promise<void> {
    const lengths = swimming.lengths
    if (!lengths?.length) return

    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    await db.from('apple_health_swim_lengths').delete().eq('workout_id', workoutId)

    const rows = lengths.map((length) => {
      const swolf =
        length.swolf ??
        (length.strokeCount != null ? length.durationSeconds + length.strokeCount : null)

      return {
        workout_id: workoutId,
        length_number: length.lengthNumber,
        start_date: length.startDate,
        duration_seconds: length.durationSeconds,
        stroke_count: length.strokeCount ?? null,
        stroke_style: length.strokeStyle ?? null,
        swolf,
        is_rest: length.isRest ?? false,
      }
    })

    const { error } = await db.from('apple_health_swim_lengths').insert(rows)
    if (error) {
      console.error('Error saving swim lengths:', error)
      return
    }

    // Roll up: only swum lengths count toward pace and SWOLF averages.
    const swum = rows.filter((row) => !row.is_rest && row.duration_seconds > 0)
    if (swum.length === 0) return

    const swolfValues = swum
      .map((row) => row.swolf)
      .filter((value): value is number => value != null)

    const poolMeters = swimming.poolLengthMeters ?? null
    const totalSeconds = swum.reduce((sum, row) => sum + row.duration_seconds, 0)
    const totalMeters = poolMeters ? poolMeters * swum.length : null

    const { error: updateError } = await db
      .from('apple_health_workouts')
      .update({
        swimming_lap_count: swum.length,
        swimming_avg_swolf: swolfValues.length
          ? Math.round((swolfValues.reduce((a, b) => a + b, 0) / swolfValues.length) * 100) / 100
          : null,
        swimming_avg_pace_per_100:
          totalMeters && totalMeters > 0
            ? Math.round((totalSeconds / totalMeters) * 100 * 100) / 100
            : null,
      })
      .eq('id', workoutId)

    if (updateError) {
      console.error('Error rolling up swim lengths:', updateError)
    }
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
