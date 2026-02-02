/**
 * Settings Service
 * Handles fetching and updating application settings from Supabase
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'

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

// Default settings to use when DB is not available or no settings exist
export const DEFAULT_SETTINGS: Omit<
  AppSettings,
  'id' | 'created_at' | 'updated_at'
> = {
  rounded_layout: true,
  theme: 'system',
  brand_color: 'yellow',
}

class SettingsService {
  /**
   * Get the current app settings
   * Returns default settings if Supabase is not configured or no settings exist
   */
  async getSettings(): Promise<AppSettings | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      console.log('[SettingsService] Supabase not configured, using defaults')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        // PGRST116 means no rows found - this is expected on first run
        if (error.code === 'PGRST116') {
          console.log('[SettingsService] No settings found, will use defaults')
          return null
        }
        console.error('[SettingsService] Error fetching settings:', error)
        return null
      }

      return data as AppSettings
    } catch (err) {
      console.error('[SettingsService] Unexpected error:', err)
      return null
    }
  }

  /**
   * Update app settings
   * Creates settings row if it doesn't exist
   */
  async updateSettings(
    updates: AppSettingsUpdate
  ): Promise<AppSettings | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      console.error('[SettingsService] Supabase not configured for writes')
      return null
    }

    try {
      // First, try to get existing settings
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .single()

      if (existing) {
        // Update existing row
        const { data, error } = await supabase
          .from('app_settings')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('[SettingsService] Error updating settings:', error)
          return null
        }

        return data as AppSettings
      } else {
        // Insert new row with defaults + updates
        const { data, error } = await supabase
          .from('app_settings')
          .insert({ ...DEFAULT_SETTINGS, ...updates })
          .select()
          .single()

        if (error) {
          console.error('[SettingsService] Error creating settings:', error)
          return null
        }

        return data as AppSettings
      }
    } catch (err) {
      console.error('[SettingsService] Unexpected error:', err)
      return null
    }
  }

  /**
   * Initialize settings if they don't exist
   */
  async initializeSettings(): Promise<AppSettings | null> {
    const existing = await this.getSettings()
    if (existing) return existing

    return this.updateSettings(DEFAULT_SETTINGS)
  }
}

export const settingsService = new SettingsService()
