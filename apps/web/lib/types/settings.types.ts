/**
 * Settings Types
 * Type definitions for application settings
 */

import type { CalendarViewMode } from './calendar-views.types'

export type DisplayInput = 'hdmi' | 'displayport'

export interface CalendarConfig {
  default_view: CalendarViewMode
  week_starts_on: 0 | 1
  show_fitness_events: boolean
  show_meal_plan_events: boolean
  show_declined_events: boolean
  show_weekends: boolean
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  default_view: 'week',
  week_starts_on: 1,
  show_fitness_events: true,
  show_meal_plan_events: true,
  show_declined_events: false,
  show_weekends: true,
}

export interface AppSettings {
  id: string
  rounded_layout: boolean
  theme: 'light' | 'dark' | 'system'
  brand_color: 'purple' | 'blue' | 'teal' | 'orange' | 'pink' | 'yellow'
  // Display/KVM configuration
  display_monitor: string // e.g., '\\.\DISPLAY1', '\\.\DISPLAY2'
  display_primary_input: DisplayInput
  display_secondary_input: DisplayInput
  // Calendar configuration
  calendar_config: CalendarConfig
  created_at: string
  updated_at: string
}

export type AppSettingsUpdate = Partial<
  Pick<
    AppSettings,
    | 'rounded_layout'
    | 'theme'
    | 'brand_color'
    | 'display_monitor'
    | 'display_primary_input'
    | 'display_secondary_input'
    | 'calendar_config'
  >
>

export type BrandColor = AppSettings['brand_color']
export type ThemeMode = AppSettings['theme']
