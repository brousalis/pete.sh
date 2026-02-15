/**
 * Settings Types
 * Type definitions for application settings
 */

export type DisplayInput = 'hdmi' | 'displayport'

export interface AppSettings {
  id: string
  rounded_layout: boolean
  theme: 'light' | 'dark' | 'system'
  brand_color: 'purple' | 'blue' | 'teal' | 'orange' | 'pink' | 'yellow'
  // Display/KVM configuration
  display_monitor: string // e.g., '\\.\DISPLAY1', '\\.\DISPLAY2'
  display_primary_input: DisplayInput
  display_secondary_input: DisplayInput
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
  >
>

export type BrandColor = AppSettings['brand_color']
export type ThemeMode = AppSettings['theme']
