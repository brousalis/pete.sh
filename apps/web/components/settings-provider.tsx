'use client'

import type { AppSettings, AppSettingsUpdate } from '@/lib/types/settings.types'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

// Default settings to use before fetching from API
const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'created_at' | 'updated_at'> =
  {
    rounded_layout: true,
    theme: 'system',
    brand_color: 'yellow',
    // Display defaults - DISPLAY2 (Dell U2713H) with DisplayPort as primary, HDMI as secondary
    display_monitor: '\\\\.\\DISPLAY2',
    display_primary_input: 'displayport',
    display_secondary_input: 'hdmi',
  }

interface SettingsContextType {
  settings: AppSettings | null
  isLoading: boolean
  error: string | null
  updateSettings: (updates: AppSettingsUpdate) => Promise<void>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/settings')

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data)
    } catch (err) {
      console.error('[SettingsProvider] Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      // Use defaults on error
      setSettings({
        id: 'default',
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(
    async (updates: AppSettingsUpdate) => {
      try {
        setError(null)

        // Optimistic update
        if (settings) {
          setSettings({ ...settings, ...updates })
        }

        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error('Failed to update settings')
        }

        const data = await response.json()
        setSettings(data)
      } catch (err) {
        console.error('[SettingsProvider] Error updating settings:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to update settings'
        )
        // Revert on error by refetching
        await fetchSettings()
        throw err
      }
    },
    [settings, fetchSettings]
  )

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        error,
        updateSettings,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

/**
 * Hook to get just the rounded layout setting
 * Returns true by default while loading
 */
export function useRoundedLayout() {
  const { settings, isLoading } = useSettings()
  // Default to true while loading for a smoother experience
  return isLoading ? true : (settings?.rounded_layout ?? true)
}
