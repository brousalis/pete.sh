/**
 * Supabase Database Types
 * Generated from the database schema
 *
 * Note: In a production setup, these types would be auto-generated using:
 * npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts
 */

import type { CalendarEvent } from '@/lib/types/calendar.types'
import type {
  RecipeDifficulty,
  RecipeSource,
  RecipeStep,
  ShoppingListItem,
  ShoppingListStatus,
  WeeklyMeals,
} from '@/lib/types/cooking.types'
import type {
  CTABusPrediction,
  CTATrainPrediction,
} from '@/lib/types/cta.types'
import type {
  DailyRoutine,
  DayOfWeek,
  InjuryProtocol,
  UserProfile,
  WeeklySchedule,
  Workout,
} from '@/lib/types/fitness.types'
import type { HueLight, HueZone } from '@/lib/types/hue.types'
import type {
  SpotifyDevice,
  SpotifyPlaybackState,
  SpotifyUser,
} from '@/lib/types/spotify.types'

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
  routine_version_id: string | null
  created_at: string
  updated_at: string
}

export interface FitnessRoutineVersionRow {
  id: string
  routine_id: string
  version_number: number
  name: string
  change_summary: string | null
  user_profile: UserProfile
  injury_protocol: InjuryProtocol | null
  schedule: WeeklySchedule
  daily_routines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  workout_definitions: Record<DayOfWeek, Workout>
  is_active: boolean
  is_draft: boolean
  created_at: string
  updated_at: string
  activated_at: string | null
}

export interface WorkoutDefinitionRow {
  id: string
  routine_id: string
  day_of_week: DayOfWeek
  workout: Workout
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
  routine_version_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface FitnessRoutineVersionInsert {
  id?: string
  routine_id: string
  version_number: number
  name: string
  change_summary?: string | null
  user_profile: UserProfile
  injury_protocol?: InjuryProtocol | null
  schedule: WeeklySchedule
  daily_routines: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  workout_definitions: Record<DayOfWeek, Workout>
  is_active?: boolean
  is_draft?: boolean
  created_at?: string
  updated_at?: string
  activated_at?: string | null
}

export interface WorkoutDefinitionInsert {
  id?: string
  routine_id: string
  day_of_week: DayOfWeek
  workout: Workout
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

// Spotify Listening History types
export interface SpotifyListeningHistoryRow {
  id: string
  track_id: string
  track_uri: string
  track_name: string
  track_artists: string
  track_artist_ids: string | null
  album_name: string
  album_id: string | null
  album_image_url: string | null
  duration_ms: number
  context_type: 'album' | 'artist' | 'playlist' | 'show' | null
  context_uri: string | null
  played_at: string
  tempo: number | null
  energy: number | null
  danceability: number | null
  valence: number | null
  synced_at: string
  created_at: string
}

export interface SpotifyListeningHistoryInsert {
  id?: string
  track_id: string
  track_uri: string
  track_name: string
  track_artists: string
  track_artist_ids?: string | null
  album_name: string
  album_id?: string | null
  album_image_url?: string | null
  duration_ms: number
  context_type?: 'album' | 'artist' | 'playlist' | 'show' | null
  context_uri?: string | null
  played_at: string
  tempo?: number | null
  energy?: number | null
  danceability?: number | null
  valence?: number | null
  synced_at?: string
  created_at?: string
}

export interface SpotifySyncCursorRow {
  id: string
  last_played_at: string | null
  last_sync_at: string
  total_tracks_synced: number
  created_at: string
  updated_at: string
}

export interface SpotifySyncCursorInsert {
  id?: string
  last_played_at?: string | null
  last_sync_at?: string
  total_tracks_synced?: number
  created_at?: string
  updated_at?: string
}

// App Settings Types
export interface AppSettingsRow {
  id: string
  rounded_layout: boolean
  theme: 'light' | 'dark' | 'system'
  brand_color: 'purple' | 'blue' | 'teal' | 'orange' | 'pink' | 'yellow'
  created_at: string
  updated_at: string
}

export interface AppSettingsInsert {
  id?: string
  rounded_layout?: boolean
  theme?: 'light' | 'dark' | 'system'
  brand_color?: 'purple' | 'blue' | 'teal' | 'orange' | 'pink' | 'yellow'
  created_at?: string
  updated_at?: string
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

// Cooking-related types
export interface RecipeRow {
  id: string
  name: string
  description: string | null
  source: RecipeSource
  source_url: string | null
  prep_time: number | null
  cook_time: number | null
  servings: number | null
  difficulty: RecipeDifficulty | null
  tags: string[]
  image_url: string | null
  instructions: RecipeStep[] | Record<string, unknown>
  notes: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface RecipeInsert {
  id?: string
  name: string
  description?: string | null
  source?: RecipeSource
  source_url?: string | null
  prep_time?: number | null
  cook_time?: number | null
  servings?: number | null
  difficulty?: RecipeDifficulty | null
  tags?: string[]
  image_url?: string | null
  instructions?: RecipeStep[] | Record<string, unknown>
  notes?: string | null
  is_favorite?: boolean
  created_at?: string
  updated_at?: string
}

export interface RecipeIngredientRow {
  id: string
  recipe_id: string
  name: string
  amount: number | null
  unit: string | null
  notes: string | null
  order_index: number
  created_at: string
}

export interface RecipeIngredientInsert {
  id?: string
  recipe_id: string
  name: string
  amount?: number | null
  unit?: string | null
  notes?: string | null
  order_index: number
  created_at?: string
}

export interface RecipeVersionRow {
  id: string
  recipe_id: string
  version_number: number
  commit_message: string | null
  recipe_snapshot: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface RecipeVersionInsert {
  id?: string
  recipe_id: string
  version_number: number
  commit_message?: string | null
  recipe_snapshot: Record<string, unknown>
  created_by?: string | null
  created_at?: string
}

export interface MealPlanRow {
  id: string
  week_start_date: string
  year: number
  week_number: number
  meals: WeeklyMeals | Record<string, unknown>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MealPlanInsert {
  id?: string
  week_start_date?: string
  year: number
  week_number: number
  meals: WeeklyMeals | Record<string, unknown>
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface ShoppingListRow {
  id: string
  meal_plan_id: string
  items: ShoppingListItem[] | Record<string, unknown>[]
  status: ShoppingListStatus
  created_at: string
  updated_at: string
}

export interface ShoppingListInsert {
  id?: string
  meal_plan_id: string
  items: ShoppingListItem[] | Record<string, unknown>[]
  status?: ShoppingListStatus
  created_at?: string
  updated_at?: string
}

export interface TraderJoesRecipeRow {
  id: string
  tj_recipe_id: string | null
  name: string
  url: string
  category: string | null
  image_url: string | null
  recipe_data: Record<string, unknown>
  last_scraped_at: string | null
  created_at: string
}

export interface TraderJoesRecipeInsert {
  id?: string
  tj_recipe_id?: string | null
  name: string
  url: string
  category?: string | null
  image_url?: string | null
  recipe_data: Record<string, unknown>
  last_scraped_at?: string | null
  created_at?: string
}

// Coffee Config types
export interface CoffeeRoastStrategyRow {
  id: string
  roast: string
  goal: string
  temp: string
  technique: string
  ratio: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CoffeeRoastStrategyInsert {
  id?: string
  roast: string
  goal: string
  temp: string
  technique: string
  ratio: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface CoffeeRecipeRow {
  id: string
  method: string
  cup_size: string
  cup_size_label: string
  water_ml: number
  roast: string
  ratio: string
  coffee: number
  temp: string
  technique: string
  switch_setting: string | null
  mocca_setting: string | null
  timing_cues: unknown[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CoffeeRecipeInsert {
  id?: string
  method: string
  cup_size: string
  cup_size_label: string
  water_ml: number
  roast: string
  ratio: string
  coffee: number
  temp: string
  technique: string
  switch_setting?: string | null
  mocca_setting?: string | null
  timing_cues?: unknown[]
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface CoffeeQuickDoseRow {
  id: string
  method: string
  label: string
  grams: number
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CoffeeQuickDoseInsert {
  id?: string
  method: string
  label: string
  grams: number
  note?: string | null
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface CoffeeGoldenRuleRow {
  id: string
  title: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CoffeeGoldenRuleInsert {
  id?: string
  title: string
  description: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface CoffeeRecommendationRow {
  id: string
  name: string
  day_of_week: number | null
  hour_start: number
  hour_end: number
  method: string
  cup_size: string
  roast: string
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CoffeeRecommendationInsert {
  id?: string
  name: string
  day_of_week?: number | null
  hour_start: number
  hour_end: number
  method: string
  cup_size: string
  roast: string
  priority?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Blog Types
export interface BlogPostRow {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: Record<string, unknown>
  content_html: string | null
  featured_image: string | null
  status: 'draft' | 'published'
  tags: string[]
  reading_time_minutes: number | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface BlogPostInsert {
  id?: string
  title: string
  slug: string
  excerpt?: string | null
  content: Record<string, unknown>
  content_html?: string | null
  featured_image?: string | null
  status?: 'draft' | 'published'
  tags?: string[]
  reading_time_minutes?: number | null
  published_at?: string | null
  created_at?: string
  updated_at?: string
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
      fitness_routine_versions: {
        Row: FitnessRoutineVersionRow
        Insert: FitnessRoutineVersionInsert
        Update: Partial<FitnessRoutineVersionInsert>
      }
      workout_definitions: {
        Row: WorkoutDefinitionRow
        Insert: WorkoutDefinitionInsert
        Update: Partial<WorkoutDefinitionInsert>
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
      // Cooking tables
      recipes: {
        Row: RecipeRow
        Insert: RecipeInsert
        Update: Partial<RecipeInsert>
      }
      recipe_ingredients: {
        Row: RecipeIngredientRow
        Insert: RecipeIngredientInsert
        Update: Partial<RecipeIngredientInsert>
      }
      recipe_versions: {
        Row: RecipeVersionRow
        Insert: RecipeVersionInsert
        Update: Partial<RecipeVersionInsert>
      }
      meal_plans: {
        Row: MealPlanRow
        Insert: MealPlanInsert
        Update: Partial<MealPlanInsert>
      }
      shopping_lists: {
        Row: ShoppingListRow
        Insert: ShoppingListInsert
        Update: Partial<ShoppingListInsert>
      }
      trader_joes_recipes: {
        Row: TraderJoesRecipeRow
        Insert: TraderJoesRecipeInsert
        Update: Partial<TraderJoesRecipeInsert>
      }
      // Coffee config tables
      coffee_roast_strategies: {
        Row: CoffeeRoastStrategyRow
        Insert: CoffeeRoastStrategyInsert
        Update: Partial<CoffeeRoastStrategyInsert>
      }
      coffee_recipes: {
        Row: CoffeeRecipeRow
        Insert: CoffeeRecipeInsert
        Update: Partial<CoffeeRecipeInsert>
      }
      coffee_quick_doses: {
        Row: CoffeeQuickDoseRow
        Insert: CoffeeQuickDoseInsert
        Update: Partial<CoffeeQuickDoseInsert>
      }
      coffee_golden_rules: {
        Row: CoffeeGoldenRuleRow
        Insert: CoffeeGoldenRuleInsert
        Update: Partial<CoffeeGoldenRuleInsert>
      }
      coffee_recommendations: {
        Row: CoffeeRecommendationRow
        Insert: CoffeeRecommendationInsert
        Update: Partial<CoffeeRecommendationInsert>
      }
      // Blog tables
      blog_posts: {
        Row: BlogPostRow
        Insert: BlogPostInsert
        Update: Partial<BlogPostInsert>
      }
      // Spotify listening history tables
      spotify_listening_history: {
        Row: SpotifyListeningHistoryRow
        Insert: SpotifyListeningHistoryInsert
        Update: Partial<SpotifyListeningHistoryInsert>
      }
      spotify_sync_cursor: {
        Row: SpotifySyncCursorRow
        Insert: SpotifySyncCursorInsert
        Update: Partial<SpotifySyncCursorInsert>
      }
      // App settings table
      app_settings: {
        Row: AppSettingsRow
        Insert: AppSettingsInsert
        Update: Partial<AppSettingsInsert>
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
      get_spotify_listening_history: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_start_date?: string | null
          p_end_date?: string | null
        }
        Returns: SpotifyListeningHistoryRow[]
      }
      get_spotify_listening_stats: {
        Args: {
          p_days?: number
        }
        Returns: {
          total_tracks: number
          unique_tracks: number
          unique_artists: number
          total_listening_time_ms: number
          top_track: string | null
          top_track_count: number | null
          top_artist: string | null
          top_artist_count: number | null
        }[]
      }
      get_active_routine_version: {
        Args: {
          p_routine_id: string
        }
        Returns: FitnessRoutineVersionRow | null
      }
      get_latest_version_number: {
        Args: {
          p_routine_id: string
        }
        Returns: number
      }
      get_workout_definitions: {
        Args: {
          p_routine_id: string
        }
        Returns: WorkoutDefinitionRow[]
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
