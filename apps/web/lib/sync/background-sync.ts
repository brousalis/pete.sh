/**
 * Background Sync
 * Provides mechanisms for continuous state recording in local mode
 * 
 * This module handles syncing data from real services to Supabase
 * so that production mode has fresh data to display.
 * 
 * Sync Strategy (after optimization):
 * - All adapters now use change detection to minimize writes
 * - CTA: Uses syncToHistory() which only writes on meaningful changes
 * - Hue: Separates state sync (every 5 min) from scene sync (hourly)
 * - Spotify: Only writes on track or playback state changes
 * - Cleanup: Can be triggered to remove old historical data
 */

import { isLocalMode } from '@/lib/utils/mode'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getHueAdapter } from '@/lib/adapters/hue.adapter'
import { getSpotifyAdapter } from '@/lib/adapters/spotify.adapter'
import { getCTAAdapter } from '@/lib/adapters/cta.adapter'
import { getCalendarAdapter } from '@/lib/adapters/calendar.adapter'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { getSpotifyHistoryService } from '@/lib/services/spotify-history.service'
import { getAuthenticatedSpotifyService } from '@/lib/spotify-auth'
import { cleanupAllTables, isCleanupAvailable } from '@/lib/utils/data-cleanup'
import type { SyncResult } from '@/lib/adapters/base.adapter'

export interface SyncServiceResult {
  service: string
  success: boolean
  recordsWritten: number
  error?: string
  durationMs: number
  /** Whether write was skipped due to no changes (change detection) */
  skipped?: boolean
}

export interface SyncAllResult {
  success: boolean
  totalRecordsWritten: number
  services: SyncServiceResult[]
  durationMs: number
  timestamp: string
  /** Summary of cleanup if run */
  cleanup?: {
    ran: boolean
    deleted: number
    error?: string
  }
}

/**
 * Sync Hue state to Supabase
 * Uses change detection - only writes when light/zone states actually change
 * Scenes are synced separately on a longer interval (hourly)
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

    // refreshCache now uses change detection internally
    const result = await adapter.refreshCache()
    return {
      service: 'hue',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
      skipped: result.skipped,
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
 * Sync Hue scenes separately (for manual/hourly sync)
 * Scenes rarely change, so they're synced on a longer interval
 */
export async function syncHueScenes(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const adapter = getHueAdapter()
    
    if (!adapter.isConfigured()) {
      return {
        service: 'hue-scenes',
        success: false,
        recordsWritten: 0,
        error: 'Hue not configured',
        durationMs: Date.now() - start,
      }
    }

    const result = await adapter.syncScenes()
    return {
      service: 'hue-scenes',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
      skipped: result.skipped,
    }
  } catch (error) {
    return {
      service: 'hue-scenes',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync Spotify state to Supabase
 * Uses change detection - only writes when track or playback state changes
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

    // refreshCache now uses change detection internally
    const result = await adapter.refreshCache()
    return {
      service: 'spotify',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
      skipped: result.skipped,
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
 * Sync Spotify listening history to Supabase
 * Fetches recent plays and stores them for persistent history
 * Note: Requires authenticated Spotify service
 */
export async function syncSpotifyHistory(): Promise<SyncServiceResult> {
  const start = Date.now()
  try {
    const historyService = getSpotifyHistoryService()
    
    if (!historyService.isConfigured()) {
      return {
        service: 'spotify-history',
        success: false,
        recordsWritten: 0,
        error: 'History service not configured (Supabase required)',
        durationMs: Date.now() - start,
      }
    }

    // Get authenticated Spotify service
    const { service: spotifyService, authenticated } = await getAuthenticatedSpotifyService()
    
    if (!authenticated) {
      return {
        service: 'spotify-history',
        success: false,
        recordsWritten: 0,
        error: 'Spotify not authenticated',
        durationMs: Date.now() - start,
      }
    }

    // Set the authenticated service
    historyService.setSpotifyService(spotifyService)

    // Sync recent plays
    const result = await historyService.syncRecentPlays()
    
    return {
      service: 'spotify-history',
      success: result.success,
      recordsWritten: result.newTracks,
      error: result.error,
      durationMs: Date.now() - start,
    }
  } catch (error) {
    return {
      service: 'spotify-history',
      success: false,
      recordsWritten: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Sync CTA data to Supabase
 * Uses change detection - only writes when predictions meaningfully change
 * (not on every poll, only during explicit sync operations)
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

    // Use syncToHistory which has built-in change detection
    const result = await adapter.syncToHistory()
    return {
      service: 'cta',
      success: result.success,
      recordsWritten: result.recordsWritten,
      error: result.error,
      durationMs: Date.now() - start,
      skipped: result.skipped,
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
 * 
 * @param options.runCleanup - If true, runs data cleanup after sync
 */
export async function syncAll(options?: { runCleanup?: boolean }): Promise<SyncAllResult> {
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
  // All adapters now use change detection to minimize writes
  const results = await Promise.all([
    syncHue(),
    syncCTA(),
    syncFitness(),
    syncSpotifyHistory(), // Sync listening history (has deduplication built in)
    // Note: Spotify state and Calendar require auth context, so they may fail
    // These are better synced via their respective API calls
  ])

  const totalRecordsWritten = results.reduce((sum, r) => sum + r.recordsWritten, 0)
  // Consider success if non-auth services succeed (spotify-history may fail if not logged in)
  const allSuccess = results.filter(r => !r.error?.includes('not authenticated')).every(r => r.success)

  // Run cleanup if requested
  let cleanup: SyncAllResult['cleanup'] = undefined
  if (options?.runCleanup && isCleanupAvailable()) {
    try {
      const cleanupResult = await cleanupAllTables()
      cleanup = {
        ran: true,
        deleted: cleanupResult.totalDeleted,
        error: cleanupResult.success ? undefined : cleanupResult.results[0]?.error,
      }
    } catch (err) {
      cleanup = {
        ran: true,
        deleted: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  return {
    success: allSuccess,
    totalRecordsWritten,
    services: results,
    durationMs: Date.now() - start,
    timestamp,
    cleanup,
  }
}

/**
 * Sync services that don't require authentication
 * (Hue, CTA, Fitness)
 * All services now use change detection to minimize writes
 * 
 * @param options.runCleanup - If true, runs data cleanup after sync
 */
export async function syncUnauthenticated(options?: { runCleanup?: boolean }): Promise<SyncAllResult> {
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
    syncFitness(),
  ])

  const totalRecordsWritten = results.reduce((sum, r) => sum + r.recordsWritten, 0)
  const allSuccess = results.filter(r => !r.error?.includes('not configured')).every(r => r.success)

  // Run cleanup if requested
  let cleanup: SyncAllResult['cleanup'] = undefined
  if (options?.runCleanup && isCleanupAvailable()) {
    try {
      const cleanupResult = await cleanupAllTables()
      cleanup = {
        ran: true,
        deleted: cleanupResult.totalDeleted,
        error: cleanupResult.success ? undefined : cleanupResult.results[0]?.error,
      }
    } catch (err) {
      cleanup = {
        ran: true,
        deleted: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  return {
    success: allSuccess,
    totalRecordsWritten,
    services: results,
    durationMs: Date.now() - start,
    timestamp,
    cleanup,
  }
}

/**
 * Run data cleanup to remove old historical records
 * Should be called periodically (e.g., daily)
 */
export async function runCleanup(): Promise<{ success: boolean; deleted: number; error?: string }> {
  if (!isCleanupAvailable()) {
    return {
      success: false,
      deleted: 0,
      error: 'Cleanup not available (requires Supabase service role key)',
    }
  }

  try {
    const result = await cleanupAllTables()
    return {
      success: result.success,
      deleted: result.totalDeleted,
      error: result.success ? undefined : result.results[0]?.error,
    }
  } catch (err) {
    return {
      success: false,
      deleted: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
