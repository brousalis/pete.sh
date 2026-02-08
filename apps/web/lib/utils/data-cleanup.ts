/**
 * Data Cleanup Utilities
 * 
 * Provides functions to clean up old time-series data from Supabase.
 * Uses the cleanup functions defined in migration 018_data_retention.sql.
 */

import { getSupabaseServiceClient, isSupabaseConfigured, hasServiceRoleKey } from '@/lib/supabase/client'

/** Default retention periods (in days) */
export const DEFAULT_RETENTION_DAYS = {
  cta_history: 7,
  hue_lights: 7,
  hue_zones: 7,
  hue_status: 7,
  hue_scenes: 30,
  spotify_state: 7,
  sonos_state: 7,
  calendar_events: 30,
  sync_log: 7,
  apple_health_hr_samples: 90,
  apple_health_cadence_samples: 90,
  apple_health_pace_samples: 90,
} as const

export type CleanupTable = keyof typeof DEFAULT_RETENTION_DAYS

/** Result of a single table cleanup */
export interface CleanupResult {
  table: string
  deletedCount: number
  retentionDays: number
  error?: string
}

/** Result of cleaning up all tables */
export interface CleanupAllResult {
  success: boolean
  totalDeleted: number
  results: CleanupResult[]
  durationMs: number
  timestamp: string
}

/** Table size and record count info */
export interface TableStats {
  tableName: string
  recordCount: number
  oldestRecord: string | null
  newestRecord: string | null
}

/**
 * Check if cleanup operations are available
 */
export function isCleanupAvailable(): boolean {
  return isSupabaseConfigured() && hasServiceRoleKey()
}

/**
 * Clean up old records from a specific table
 * 
 * @param table The table to clean up
 * @param retentionDays Number of days to retain (default: table-specific default)
 * @returns Cleanup result with deleted count
 */
export async function cleanupTable(
  table: CleanupTable,
  retentionDays?: number
): Promise<CleanupResult> {
  const days = retentionDays ?? DEFAULT_RETENTION_DAYS[table]
  
  if (!isCleanupAvailable()) {
    return {
      table,
      deletedCount: 0,
      retentionDays: days,
      error: 'Cleanup not available (Supabase service role key required)',
    }
  }

  const client = getSupabaseServiceClient()
  if (!client) {
    return {
      table,
      deletedCount: 0,
      retentionDays: days,
      error: 'Supabase client not available',
    }
  }

  try {
    // Map table names to cleanup function names
    const functionName = `cleanup_${table}`
    
    const { data, error } = await client.rpc(functionName as 'cleanup_cta_history', { retention_days: days })

    if (error) {
      return {
        table,
        deletedCount: 0,
        retentionDays: days,
        error: error.message,
      }
    }

    return {
      table,
      deletedCount: data ?? 0,
      retentionDays: days,
    }
  } catch (err) {
    return {
      table,
      deletedCount: 0,
      retentionDays: days,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Clean up old records from all time-series tables
 * Uses the master cleanup function from the database
 * 
 * @returns Summary of all cleanup operations
 */
export async function cleanupAllTables(): Promise<CleanupAllResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  if (!isCleanupAvailable()) {
    return {
      success: false,
      totalDeleted: 0,
      results: [],
      durationMs: Date.now() - startTime,
      timestamp,
    }
  }

  const client = getSupabaseServiceClient()
  if (!client) {
    return {
      success: false,
      totalDeleted: 0,
      results: [],
      durationMs: Date.now() - startTime,
      timestamp,
    }
  }

  try {
    const { data, error } = await client.rpc('cleanup_all_old_records')

    if (error) {
      return {
        success: false,
        totalDeleted: 0,
        results: [{
          table: 'all',
          deletedCount: 0,
          retentionDays: 0,
          error: error.message,
        }],
        durationMs: Date.now() - startTime,
        timestamp,
      }
    }

    const results: CleanupResult[] = ((data ?? []) as Array<{ table_name: string; deleted_count: number; retention_days: number }>).map((row) => ({
      table: row.table_name,
      deletedCount: row.deleted_count,
      retentionDays: row.retention_days,
    }))

    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0)

    return {
      success: true,
      totalDeleted,
      results,
      durationMs: Date.now() - startTime,
      timestamp,
    }
  } catch (err) {
    return {
      success: false,
      totalDeleted: 0,
      results: [{
        table: 'all',
        deletedCount: 0,
        retentionDays: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      }],
      durationMs: Date.now() - startTime,
      timestamp,
    }
  }
}

/**
 * Get record counts and date ranges for all time-series tables
 * Useful for monitoring data growth
 */
export async function getTableStats(): Promise<TableStats[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const client = getSupabaseServiceClient() ?? (await import('@/lib/supabase/client')).getSupabaseClient()
  if (!client) {
    return []
  }

  try {
    const { data, error } = await client.rpc('get_record_counts')

    if (error) {
      console.error('Error getting table stats:', error)
      return []
    }

    return ((data ?? []) as Array<{ table_name: string; record_count: number; oldest_record: string | null; newest_record: string | null }>).map((row) => ({
      tableName: row.table_name,
      recordCount: row.record_count,
      oldestRecord: row.oldest_record,
      newestRecord: row.newest_record,
    }))
  } catch (err) {
    console.error('Error getting table stats:', err)
    return []
  }
}

/**
 * Run cleanup and return a formatted summary string
 * Useful for logging
 */
export async function runCleanupWithSummary(): Promise<string> {
  const result = await cleanupAllTables()
  
  if (!result.success) {
    return `Cleanup failed: ${result.results[0]?.error ?? 'Unknown error'}`
  }

  if (result.totalDeleted === 0) {
    return `Cleanup complete: No old records to delete (${result.durationMs}ms)`
  }

  const summary = result.results
    .filter(r => r.deletedCount > 0)
    .map(r => `${r.table}: ${r.deletedCount} deleted`)
    .join(', ')

  return `Cleanup complete: ${result.totalDeleted} total records deleted (${result.durationMs}ms) - ${summary}`
}
