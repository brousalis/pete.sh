/**
 * Background Sync
 * Provides mechanisms for continuous state recording in local mode
 * 
 * This module handles syncing data from real services to Supabase
 * so that production mode has fresh data to display.
 */

import { isLocalMode } from '@/lib/utils/mode'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getHueAdapter } from '@/lib/adapters/hue.adapter'
import { getSpotifyAdapter } from '@/lib/adapters/spotify.adapter'
import { getCTAAdapter } from '@/lib/adapters/cta.adapter'
import { getCalendarAdapter } from '@/lib/adapters/calendar.adapter'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import type { SyncResult } from '@/lib/adapters/base.adapter'

export interface SyncServiceResult {
  service: string
  success: boolean
  recordsWritten: number
  error?: string
  durationMs: number
}

export interface SyncAllResult {
  success: boolean
  totalRecordsWritten: number
  services: SyncServiceResult[]
  durationMs: number
  timestamp: string
}

/**
 * Sync Hue state to Supabase
 */
export async function syncHue(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const adapter = getHueAdapter()
    
    if (!adapter.isConfigured()) {
      return {
        service: 'hue',
        success: false,
        recordsWritten: 0,
        error: 'Hue not configured',
        durationMs: Date.now() - start,
      }
    }

    const result = await adapter.refreshCache()
    return {
      service: 'hue',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      service: 'hue',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync Spotify state to Supabase
 * Note: Requires authenticated service, so this may not work in all contexts
 */
export async function syncSpotify(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const adapter = getSpotifyAdapter()
    
    if (!adapter.isConfigured()) {
      return {
        service: 'spotify',
        success: false,
        recordsWritten: 0,
        error: 'Spotify not configured',
        durationMs: Date.now() - start,
      }
    }

    const result = await adapter.refreshCache()
    return {
      service: 'spotify',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      service: 'spotify',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync CTA data to Supabase
 */
export async function syncCTA(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const adapter = getCTAAdapter()
    
    if (!adapter.isConfigured()) {
      return {
        service: 'cta',
        success: false,
        recordsWritten: 0,
        error: 'CTA not configured',
        durationMs: Date.now() - start,
      }
    }

    const result = await adapter.refreshCache()
    return {
      service: 'cta',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      service: 'cta',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync Calendar events to Supabase
 * Note: Requires authenticated service
 */
export async function syncCalendar(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const adapter = getCalendarAdapter()
    
    if (!adapter.isConfigured()) {
      return {
        service: 'calendar',
        success: false,
        recordsWritten: 0,
        error: 'Calendar not configured',
        durationMs: Date.now() - start,
      }
    }

    const result = await adapter.refreshCache()
    return {
      service: 'calendar',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      service: 'calendar',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync Fitness data to Supabase
 */
export async function syncFitness(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const adapter = getFitnessAdapter()
    const result = await adapter.syncFromJsonToSupabase()
    
    return {
      service: 'fitness',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      service: 'fitness',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync all services to Supabase
 * This is the main function to call for a full sync
 */
export async function syncAll(): Promise<SyncAllResult> {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  // Check preconditions
  if (!isLocalMode()) {
    return {
      success: false,
      totalRecordsWritten: 0,
      services: [],
      durationMs: Date.now() - start,
      timestamp,
    }
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      totalRecordsWritten: 0,
      services: [],
      durationMs: Date.now() - start,
      timestamp,
    }
  }

  // Run all syncs in parallel
  const results = await Promise.all([
    syncHue(),
    syncCTA(),
    // Note: Spotify and Calendar require auth context, so they may fail
    // These are better synced via their respective API calls
  ])

  const totalRecordsWritten = results.reduce((sum, r) => sum + r.recordsWritten, 0)
  const allSuccess = results.every(r => r.success)

  return {
    success: allSuccess,
    totalRecordsWritten,
    services: results,
    durationMs: Date.now() - start,
    timestamp,
  }
}

/**
 * Sync services that don't require authentication
 * (Hue, CTA)
 */
export async function syncUnauthenticated(): Promise<SyncAllResult> {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  if (!isLocalMode() || !isSupabaseConfigured()) {
    return {
      success: false,
      totalRecordsWritten: 0,
      services: [],
      durationMs: Date.now() - start,
      timestamp,
    }
  }

  const results = await Promise.all([
    syncHue(),
    syncCTA(),
  ])

  const totalRecordsWritten = results.reduce((sum, r) => sum + r.recordsWritten, 0)
  const allSuccess = results.filter(r => !r.error?.includes('not configured')).every(r => r.success)

  return {
    success: allSuccess,
    totalRecordsWritten,
    services: results,
    durationMs: Date.now() - start,
    timestamp,
  }
}
