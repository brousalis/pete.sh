/**
 * Supabase Database Types
 * Generated from the database schema
 * 
 * Note: In a production setup, these types would be auto-generated using:
 * npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts
 */

import type { SpotifyPlaybackState, SpotifyDevice, SpotifyUser } from '@/lib/types/spotify.types'
import type { SonosState, SonosTrack, SonosPlayer } from '@/lib/types/sonos.types'
import type { HueLight, HueZone, HueScene, HueAllLightsStatus } from '@/lib/types/hue.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { CTABusPrediction, CTATrainPrediction } from '@/lib/types/cta.types'
import type { 
  WeeklyRoutine, 
  UserProfile, 
  InjuryProtocol, 
  WeeklySchedule, 
  DailyRoutine,
  DayOfWeek 
} from '@/lib/types/fitness.types'

export interface Database {
  public: {
    Tables: {
      // Spotify State
      spotify_state: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['spotify_state']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['spotify_state']['Insert']>
      }

      // Sonos State
      sonos_state: {
        Row: {
          id: string
          player_id: string
          player_name: string | null
          room_name: string | null
          state: SonosState | null
          current_track: SonosTrack | null
          playback_state: 'PLAYING' | 'PAUSED' | 'STOPPED' | null
          volume: number | null
          is_muted: boolean
          recorded_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sonos_state']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sonos_state']['Insert']>
      }

      // Hue Lights
      hue_lights: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['hue_lights']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['hue_lights']['Insert']>
      }

      // Hue Zones
      hue_zones: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['hue_zones']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['hue_zones']['Insert']>
      }

      // Hue Scenes
      hue_scenes: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['hue_scenes']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['hue_scenes']['Insert']>
      }

      // Hue Status
      hue_status: {
        Row: {
          id: string
          total_lights: number
          lights_on: number
          any_on: boolean
          all_on: boolean
          average_brightness: number
          recorded_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['hue_status']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['hue_status']['Insert']>
      }

      // Fitness Routines
      fitness_routines: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['fitness_routines']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['fitness_routines']['Insert']>
      }

      // Fitness Weeks
      fitness_weeks: {
        Row: {
          id: string
          routine_id: string
          week_number: number
          year: number
          start_date: string
          days: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['fitness_weeks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['fitness_weeks']['Insert']>
      }

      // Fitness Progress
      fitness_progress: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['fitness_progress']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['fitness_progress']['Insert']>
      }

      // CTA History
      cta_history: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['cta_history']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cta_history']['Insert']>
      }

      // Calendar Events
      calendar_events: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['calendar_events']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['calendar_events']['Insert']>
      }

      // Sync Log
      sync_log: {
        Row: {
          id: string
          service: 'spotify' | 'sonos' | 'hue' | 'cta' | 'calendar' | 'fitness'
          status: 'success' | 'error'
          error_message: string | null
          records_synced: number
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['sync_log']['Row'], 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['sync_log']['Insert']>
      }
    }
    Functions: {
      get_latest_spotify_state: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['spotify_state']['Row'] | null
      }
      get_latest_sonos_state: {
        Args: { p_player_id: string }
        Returns: Database['public']['Tables']['sonos_state']['Row'] | null
      }
      get_latest_hue_status: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['hue_status']['Row'] | null
      }
      get_latest_hue_lights: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['hue_lights']['Row'][]
      }
      get_latest_hue_zones: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['hue_zones']['Row'][]
      }
      get_latest_hue_scenes: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['hue_scenes']['Row'][]
      }
    }
  }
}

// Export table row types for convenience
export type SpotifyStateRow = Database['public']['Tables']['spotify_state']['Row']
export type SpotifyStateInsert = Database['public']['Tables']['spotify_state']['Insert']

export type SonosStateRow = Database['public']['Tables']['sonos_state']['Row']
export type SonosStateInsert = Database['public']['Tables']['sonos_state']['Insert']

export type HueLightRow = Database['public']['Tables']['hue_lights']['Row']
export type HueLightInsert = Database['public']['Tables']['hue_lights']['Insert']

export type HueZoneRow = Database['public']['Tables']['hue_zones']['Row']
export type HueZoneInsert = Database['public']['Tables']['hue_zones']['Insert']

export type HueSceneRow = Database['public']['Tables']['hue_scenes']['Row']
export type HueSceneInsert = Database['public']['Tables']['hue_scenes']['Insert']

export type HueStatusRow = Database['public']['Tables']['hue_status']['Row']
export type HueStatusInsert = Database['public']['Tables']['hue_status']['Insert']

export type FitnessRoutineRow = Database['public']['Tables']['fitness_routines']['Row']
export type FitnessRoutineInsert = Database['public']['Tables']['fitness_routines']['Insert']

export type FitnessWeekRow = Database['public']['Tables']['fitness_weeks']['Row']
export type FitnessWeekInsert = Database['public']['Tables']['fitness_weeks']['Insert']

export type FitnessProgressRow = Database['public']['Tables']['fitness_progress']['Row']
export type FitnessProgressInsert = Database['public']['Tables']['fitness_progress']['Insert']

export type CTAHistoryRow = Database['public']['Tables']['cta_history']['Row']
export type CTAHistoryInsert = Database['public']['Tables']['cta_history']['Insert']

export type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row']
export type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']

export type SyncLogRow = Database['public']['Tables']['sync_log']['Row']
export type SyncLogInsert = Database['public']['Tables']['sync_log']['Insert']

export type ServiceName = SyncLogRow['service']
