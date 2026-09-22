/**
 * Apple Health insert/row types used by apple-health.service.
 * Legacy home/dashboard table types were removed with the coach-only cut.
 */
// Apple Health Types
export interface AppleHealthWorkoutRow {
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
  hr_zones: unknown[] | null
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

export interface AppleHealthWorkoutInsert {
  id?: string
  healthkit_id: string
  workout_type: string
  workout_type_raw?: number | null
  start_date: string
  end_date: string
  duration: number
  active_calories: number
  total_calories: number
  distance_meters?: number | null
  distance_miles?: number | null
  elevation_gain_meters?: number | null
  hr_average?: number | null
  hr_min?: number | null
  hr_max?: number | null
  hr_zones?: unknown[] | null
  hr_zone_source?: string | null
  // Running metrics
  cadence_average?: number | null
  pace_average?: number | null
  pace_best?: number | null
  stride_length_avg?: number | null
  running_power_avg?: number | null
  ground_contact_time_avg?: number | null
  vertical_oscillation_avg?: number | null
  // Cycling metrics
  cycling_avg_speed?: number | null
  cycling_max_speed?: number | null
  cycling_avg_cadence?: number | null
  cycling_avg_power?: number | null
  cycling_max_power?: number | null
  // Walking metrics
  walking_avg_speed?: number | null
  walking_avg_step_length?: number | null
  walking_double_support_pct?: number | null
  walking_asymmetry_pct?: number | null
  walking_step_count?: number | null
  // Swimming metrics
  swimming_stroke_count?: number | null
  swimming_pool_length_meters?: number | null
  swimming_location?: string | null
  // Indoor/outdoor flag
  is_indoor?: boolean | null
  // Effort score
  effort_score?: number | null
  // Metadata
  source: string
  source_version?: string | null
  device_name?: string | null
  device_model?: string | null
  weather_temp_celsius?: number | null
  weather_humidity?: number | null
  linked_workout_id?: string | null
  linked_day?: string | null
  linked_week?: number | null
  linked_year?: number | null
  recorded_at?: string
  created_at?: string
}

export interface AppleHealthHrSampleRow {
  id: string
  workout_id: string
  timestamp: string
  bpm: number
  motion_context: string | null
}

export interface AppleHealthHrSampleInsert {
  id?: string
  workout_id: string
  timestamp: string
  bpm: number
  motion_context?: string | null
}

export interface AppleHealthCadenceSampleRow {
  id: string
  workout_id: string
  timestamp: string
  steps_per_minute: number
}

export interface AppleHealthCadenceSampleInsert {
  id?: string
  workout_id: string
  timestamp: string
  steps_per_minute: number
}

export interface AppleHealthPaceSampleRow {
  id: string
  workout_id: string
  timestamp: string
  minutes_per_mile: number
  speed_mph: number | null
}

export interface AppleHealthPaceSampleInsert {
  id?: string
  workout_id: string
  timestamp: string
  minutes_per_mile: number
  speed_mph?: number | null
}

export interface AppleHealthRouteRow {
  id: string
  workout_id: string
  total_distance_meters: number
  total_elevation_gain: number
  total_elevation_loss: number
  samples: unknown[]
}

export interface AppleHealthRouteInsert {
  id?: string
  workout_id: string
  total_distance_meters: number
  total_elevation_gain: number
  total_elevation_loss: number
  samples: unknown[]
}

export interface AppleHealthDailyMetricsRow {
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
  created_at: string
}

export interface AppleHealthDailyMetricsInsert {
  id?: string
  date: string
  steps: number
  active_calories: number
  total_calories: number
  exercise_minutes: number
  stand_hours: number
  move_goal?: number | null
  exercise_goal?: number | null
  stand_goal?: number | null
  resting_heart_rate?: number | null
  heart_rate_variability?: number | null
  hrv_overnight_avg?: number | null
  hrv_morning?: number | null
  hrv_sample_count?: number | null
  hrv_rmssd?: number | null
  hrv_rmssd_overnight_avg?: number | null
  hrv_rmssd_morning?: number | null
  hrv_rmssd_sample_count?: number | null
  vo2_max?: number | null
  apple_training_load?: number | null
  sleep_duration?: number | null
  sleep_in_bed?: number | null
  sleep_start?: string | null
  sleep_end?: string | null
  sleep_awake?: number | null
  sleep_rem?: number | null
  sleep_core?: number | null
  sleep_deep?: number | null
  sleep_unspecified?: number | null
  respiratory_rate?: number | null
  wrist_temp_delta?: number | null
  oxygen_saturation?: number | null
  breathing_disturbances?: number | null
  breathing_disturbances_elevated?: boolean | null
  sleep_apnea_event_count?: number | null
  walking_hr_average?: number | null
  walking_double_support_pct?: number | null
  walking_asymmetry_pct?: number | null
  walking_speed?: number | null
  walking_step_length?: number | null
  body_mass_lbs?: number | null
  body_fat_percentage?: number | null
  lean_body_mass_lbs?: number | null
  source: string
  recorded_at?: string
  created_at?: string
}
