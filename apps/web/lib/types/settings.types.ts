/**
 * Settings Types
 * Type definitions for application settings
 */

export interface AppSettings {
  id: string
  rounded_layout: boolean
  theme: 'light' | 'dark' | 'system'
  brand_color: 'purple' | 'blue' | 'teal' | 'orange' | 'pink' | 'yellow'
  created_at: string
  updated_at: string
}

export type AppSettingsUpdate = Partial<
  Pick<AppSettings, 'rounded_layout' | 'theme' | 'brand_color'>
>

export type BrandColor = AppSettings['brand_color']
export type ThemeMode = AppSettings['theme']
