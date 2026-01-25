/**
 * Supabase Database Types
 * Generated from the database schema
 * 
 * Note: In a production setup, these types would be auto-generated using:
 * npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts
 */

import type { SpotifyPlaybackState, SpotifyDevice, SpotifyUser } from '@/lib/types/spotify.types'
import type { HueLight, HueZone } from '@/lib/types/hue.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { CTABusPrediction, CTATrainPrediction } from '@/lib/types/cta.types'
import type { 
  UserProfile, 
  InjuryProtocol, 
  WeeklySchedule, 
  DailyRoutine,
  DayOfWeek 
} from '@/lib/types/fitness.types'

// Service name type
export type ServiceName = 'spotify' | 'hue' | 'cta' | 'calendar' | 'fitness'

// Row types for each table
export interface SpotifyStateRow {
  id: string
  playback_state: SpotifyPlaybackState | null
  devices: SpotifyDevice[] | null
  user_info: SpotifyUser | null
  is_playing: boolean
  current_track_name: string | null
  current_track_artist: string | null
  current_track_album: string | null
  current_track_image_url: string | null
  progress_ms: number | null
  duration_ms: number | null
  recorded_at: string
  created_at: string
}

export interface HueLightRow {
  id: string
  light_id: string
  name: string
  type: string | null
  model_id: string | null
  product_name: string | null
  state: HueLight['state']
  is_on: boolean
  brightness: number | null
  is_reachable: boolean
  recorded_at: string
  created_at: string
}

export interface HueZoneRow {
  id: string
  zone_id: string
  name: string
  type: string | null
  class: string | null
  lights: string[]
  state: HueZone['state']
  action: HueZone['action'] | null
  any_on: boolean
  all_on: boolean
  recorded_at: string
  created_at: string
}

export interface HueSceneRow {
  id: string
  scene_id: string
  name: string
  type: string | null
  zone_id: string | null
  zone_name: string | null
  lights: string[]
  owner: string | null
  recycle: boolean
  locked: boolean
  recorded_at: string
  created_at: string
}

export interface HueStatusRow {
  id: string
  total_lights: number
  lights_on: number
  any_on: boolean
  all_on: boolean
  average_brightness: number
  recorded_at: string
  created_at: string
}

export interface FitnessRoutineRow {
  id: string
  name: string
  user_profile: UserProfile
  injury_protocol: InjuryProtocol | null
  schedule: WeeklySchedule
  daily_routines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  created_at: string
  updated_at: string
}

export interface FitnessWeekRow {
  id: string
  routine_id: string
  week_number: number
  year: number
  start_date: string
  days: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FitnessProgressRow {
  id: string
  routine_id: string
  week_number: number
  year: number
  day_of_week: DayOfWeek
  workout_completed: boolean
  workout_completed_at: string | null
  workout_exercises_completed: string[] | null
  morning_routine_completed: boolean
  morning_routine_completed_at: string | null
  night_routine_completed: boolean
  night_routine_completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CTAHistoryRow {
  id: string
  route_type: 'bus' | 'train'
  route: string
  stop_id: string | null
  station_id: string | null
  direction: string | null
  predictions: CTABusPrediction[] | CTATrainPrediction['eta'] | null
  error_message: string | null
  recorded_at: string
  created_at: string
}

export interface CalendarEventRow {
  id: string
  event_id: string
  calendar_id: string
  summary: string | null
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  start_date: string | null
  end_date: string | null
  is_all_day: boolean
  status: 'confirmed' | 'tentative' | 'cancelled' | null
  html_link: string | null
  attendees: CalendarEvent['attendees'] | null
  recurrence: string[] | null
  event_data: CalendarEvent
  recorded_at: string
  created_at: string
}

export interface SyncLogRow {
  id: string
  service: ServiceName
  status: 'success' | 'error'
  error_message: string | null
  records_synced: number
  synced_at: string
}

// Insert types (excluding auto-generated fields)
export interface SpotifyStateInsert {
  id?: string
  playback_state: SpotifyPlaybackState | null
  devices: SpotifyDevice[] | null
  user_info: SpotifyUser | null
  is_playing: boolean
  current_track_name: string | null
  current_track_artist: string | null
  current_track_album: string | null
  current_track_image_url: string | null
  progress_ms: number | null
  duration_ms: number | null
  recorded_at: string
  created_at?: string
}

export interface HueLightInsert {
  id?: string
  light_id: string
  name: string
  type: string | null
  model_id: string | null
  product_name: string | null
  state: HueLight['state']
  is_on: boolean
  brightness: number | null
  is_reachable: boolean
  recorded_at: string
  created_at?: string
}

export interface HueZoneInsert {
  id?: string
  zone_id: string
  name: string
  type: string | null
  class: string | null
  lights: string[]
  state: HueZone['state']
  action: HueZone['action'] | null
  any_on: boolean
  all_on: boolean
  recorded_at: string
  created_at?: string
}

export interface HueSceneInsert {
  id?: string
  scene_id: string
  name: string
  type: string | null
  zone_id: string | null
  zone_name: string | null
  lights: string[]
  owner: string | null
  recycle: boolean
  locked: boolean
  recorded_at: string
  created_at?: string
}

export interface HueStatusInsert {
  id?: string
  total_lights: number
  lights_on: number
  any_on: boolean
  all_on: boolean
  average_brightness: number
  recorded_at: string
  created_at?: string
}

export interface FitnessRoutineInsert {
  id: string
  name: string
  user_profile: UserProfile
  injury_protocol: InjuryProtocol | null
  schedule: WeeklySchedule
  daily_routines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  created_at?: string
  updated_at?: string
}

export interface FitnessWeekInsert {
  id?: string
  routine_id: string
  week_number: number
  year: number
  start_date: string
  days: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface FitnessProgressInsert {
  id?: string
  routine_id: string
  week_number: number
  year: number
  day_of_week: DayOfWeek
  workout_completed: boolean
  workout_completed_at?: string | null
  workout_exercises_completed?: string[] | null
  morning_routine_completed: boolean
  morning_routine_completed_at?: string | null
  night_routine_completed: boolean
  night_routine_completed_at?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface CTAHistoryInsert {
  id?: string
  route_type: 'bus' | 'train'
  route: string
  stop_id?: string | null
  station_id?: string | null
  direction?: string | null
  predictions?: CTABusPrediction[] | CTATrainPrediction['eta'] | null
  error_message?: string | null
  recorded_at: string
  created_at?: string
}

export interface CalendarEventInsert {
  id?: string
  event_id: string
  calendar_id: string
  summary?: string | null
  description?: string | null
  location?: string | null
  start_time?: string | null
  end_time?: string | null
  start_date?: string | null
  end_date?: string | null
  is_all_day: boolean
  status?: 'confirmed' | 'tentative' | 'cancelled' | null
  html_link?: string | null
  attendees?: CalendarEvent['attendees'] | null
  recurrence?: string[] | null
  event_data: CalendarEvent
  recorded_at: string
  created_at?: string
}

export interface SyncLogInsert {
  id?: string
  service: ServiceName
  status: 'success' | 'error'
  error_message?: string | null
  records_synced: number
  synced_at: string
}

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
  cadence_average?: number | null
  pace_average?: number | null
  pace_best?: number | null
  stride_length_avg?: number | null
  running_power_avg?: number | null
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
  vo2_max?: number | null
  sleep_duration?: number | null
  sleep_awake?: number | null
  sleep_rem?: number | null
  sleep_core?: number | null
  sleep_deep?: number | null
  walking_hr_average?: number | null
  walking_double_support_pct?: number | null
  walking_asymmetry_pct?: number | null
  walking_speed?: number | null
  walking_step_length?: number | null
  source: string
  recorded_at?: string
  created_at?: string
}

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      spotify_state: {
        Row: SpotifyStateRow
        Insert: SpotifyStateInsert
        Update: Partial<SpotifyStateInsert>
      }
      hue_lights: {
        Row: HueLightRow
        Insert: HueLightInsert
        Update: Partial<HueLightInsert>
      }
      hue_zones: {
        Row: HueZoneRow
        Insert: HueZoneInsert
        Update: Partial<HueZoneInsert>
      }
      hue_scenes: {
        Row: HueSceneRow
        Insert: HueSceneInsert
        Update: Partial<HueSceneInsert>
      }
      hue_status: {
        Row: HueStatusRow
        Insert: HueStatusInsert
        Update: Partial<HueStatusInsert>
      }
      fitness_routines: {
        Row: FitnessRoutineRow
        Insert: FitnessRoutineInsert
        Update: Partial<FitnessRoutineInsert>
      }
      fitness_weeks: {
        Row: FitnessWeekRow
        Insert: FitnessWeekInsert
        Update: Partial<FitnessWeekInsert>
      }
      fitness_progress: {
        Row: FitnessProgressRow
        Insert: FitnessProgressInsert
        Update: Partial<FitnessProgressInsert>
      }
      cta_history: {
        Row: CTAHistoryRow
        Insert: CTAHistoryInsert
        Update: Partial<CTAHistoryInsert>
      }
      calendar_events: {
        Row: CalendarEventRow
        Insert: CalendarEventInsert
        Update: Partial<CalendarEventInsert>
      }
      sync_log: {
        Row: SyncLogRow
        Insert: SyncLogInsert
        Update: Partial<SyncLogInsert>
      }
      apple_health_workouts: {
        Row: AppleHealthWorkoutRow
        Insert: AppleHealthWorkoutInsert
        Update: Partial<AppleHealthWorkoutInsert>
      }
      apple_health_hr_samples: {
        Row: AppleHealthHrSampleRow
        Insert: AppleHealthHrSampleInsert
        Update: Partial<AppleHealthHrSampleInsert>
      }
      apple_health_cadence_samples: {
        Row: AppleHealthCadenceSampleRow
        Insert: AppleHealthCadenceSampleInsert
        Update: Partial<AppleHealthCadenceSampleInsert>
      }
      apple_health_pace_samples: {
        Row: AppleHealthPaceSampleRow
        Insert: AppleHealthPaceSampleInsert
        Update: Partial<AppleHealthPaceSampleInsert>
      }
      apple_health_routes: {
        Row: AppleHealthRouteRow
        Insert: AppleHealthRouteInsert
        Update: Partial<AppleHealthRouteInsert>
      }
      apple_health_daily_metrics: {
        Row: AppleHealthDailyMetricsRow
        Insert: AppleHealthDailyMetricsInsert
        Update: Partial<AppleHealthDailyMetricsInsert>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_latest_spotify_state: {
        Args: Record<string, never>
        Returns: SpotifyStateRow | null
      }
      get_latest_hue_status: {
        Args: Record<string, never>
        Returns: HueStatusRow | null
      }
      get_latest_hue_lights: {
        Args: Record<string, never>
        Returns: HueLightRow[]
      }
      get_latest_hue_zones: {
        Args: Record<string, never>
        Returns: HueZoneRow[]
      }
      get_latest_hue_scenes: {
        Args: Record<string, never>
        Returns: HueSceneRow[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
