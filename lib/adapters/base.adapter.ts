/**
 * Base Adapter
 * Provides common functionality for all service adapters
 * 
 * The adapter pattern allows seamless switching between:
 * - Local mode: Fetch from real service + write to Supabase
 * - Production mode: Read from Supabase cache
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, getSupabaseServiceClient, isSupabaseConfigured, hasServiceRoleKey } from '@/lib/supabase/client'
import { isLocalMode, isProductionMode } from '@/lib/utils/mode'
import type { Database, ServiceName } from '@/lib/supabase/types'

export interface AdapterConfig {
  /** Service name for logging and sync tracking */
  serviceName: ServiceName
  /** Whether to log operations */
  debug?: boolean
}

export interface SyncResult {
  success: boolean
  recordsWritten: number
  error?: string
}

/**
 * Base adapter class that all service adapters extend
 */
export abstract class BaseAdapter<TServiceData, TCachedData> {
  protected serviceName: ServiceName
  protected debug: boolean

  constructor(config: AdapterConfig) {
    this.serviceName = config.serviceName
    this.debug = config.debug ?? false
  }

  /**
   * Get the Supabase client for read operations
   * Returns null if Supabase is not configured
   */
  protected getReadClient(): SupabaseClient<Database> | null {
    return getSupabaseClient()
  }

  /**
   * Get the Supabase client for write operations
   * Uses service role key if available (for local mode writes)
   * Returns null if Supabase is not configured
   */
  protected getWriteClient(): SupabaseClient<Database> | null {
    if (hasServiceRoleKey()) {
      return getSupabaseServiceClient()
    }
    return getSupabaseClient()
  }

  /**
   * Check if Supabase is available for caching
   */
  protected isSupabaseAvailable(): boolean {
    return isSupabaseConfigured()
  }

  /**
   * Check if running in local mode
   */
  protected isLocal(): boolean {
    return isLocalMode()
  }

  /**
   * Check if running in production mode
   */
  protected isProduction(): boolean {
    return isProductionMode()
  }

  /**
   * Log a message if debug is enabled
   */
  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[${this.serviceName.toUpperCase()} Adapter] ${message}`, data ?? '')
    }
  }

  /**
   * Log an error
   * Silently ignores Supabase configuration errors to avoid console spam
   */
  protected logError(message: string, error?: unknown): void {
    // Suppress errors related to missing tables or unconfigured Supabase
    if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>
      // Suppress table not found errors (migration not run yet)
      if (errObj.code === 'PGRST205' || errObj.code === '42P01') return
      // Suppress connection errors when Supabase isn't properly configured  
      if (errObj.message && String(errObj.message).includes('not configured')) return
    }
    console.error(`[${this.serviceName.toUpperCase()} Adapter] ${message}`, error ?? '')
  }

  /**
   * Record a sync operation in the sync_log table
   */
  protected async logSync(status: 'success' | 'error', recordsSynced: number = 0, errorMessage?: string): Promise<void> {
    if (!this.isSupabaseAvailable()) return

    try {
      const client = this.getWriteClient()
      if (!client) return // Supabase not configured
      
      await client.from('sync_log').insert({
        service: this.serviceName,
        status,
        records_synced: recordsSynced,
        error_message: errorMessage ?? null,
        synced_at: new Date().toISOString(),
      })
    } catch (error) {
      // Silently ignore - logging sync shouldn't break the app
      if (this.debug) {
        this.logError('Failed to log sync', error)
      }
    }
  }

  /**
   * Get the last sync time for this service
   */
  async getLastSyncTime(): Promise<Date | null> {
    if (!this.isSupabaseAvailable()) return null

    try {
      const client = this.getReadClient()
      if (!client) return null // Supabase not configured
      
      const { data, error } = await client
        .from('sync_log')
        .select('synced_at')
        .eq('service', this.serviceName)
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null
      return new Date(data.synced_at)
    } catch {
      return null
    }
  }

  /**
   * Abstract method to fetch data from the real service
   * Implemented by each service adapter
   */
  protected abstract fetchFromService(): Promise<TServiceData>

  /**
   * Abstract method to fetch cached data from Supabase
   * Implemented by each service adapter
   */
  protected abstract fetchFromCache(): Promise<TCachedData | null>

  /**
   * Abstract method to write data to Supabase cache
   * Implemented by each service adapter
   */
  protected abstract writeToCache(data: TServiceData): Promise<SyncResult>

  /**
   * Main method to get data
   * In local mode: fetches from service and writes to cache
   * In production mode: reads from cache
   */
  async getData(): Promise<TServiceData | TCachedData | null> {
    if (this.isLocal()) {
      return this.getDataLocal()
    }
    return this.getDataProduction()
  }

  /**
   * Get data in local mode
   * Fetches from real service and writes to Supabase
   */
  protected async getDataLocal(): Promise<TServiceData | null> {
    this.log('Fetching from real service (local mode)')

    try {
      const data = await this.fetchFromService()
      
      // Write to cache in background (don't block the response)
      if (this.isSupabaseAvailable()) {
        this.writeToCache(data)
          .then((result) => {
            if (result.success) {
              this.log(`Cached ${result.recordsWritten} records`)
            } else {
              this.logError('Failed to cache data', result.error)
            }
          })
          .catch((error) => {
            this.logError('Error writing to cache', error)
          })
      }

      return data
    } catch (error) {
      this.logError('Error fetching from service', error)
      throw error
    }
  }

  /**
   * Get data in production mode
   * Reads from Supabase cache
   */
  protected async getDataProduction(): Promise<TCachedData | null> {
    this.log('Fetching from cache (production mode)')

    if (!this.isSupabaseAvailable()) {
      this.logError('Supabase not configured')
      return null
    }

    try {
      const data = await this.fetchFromCache()
      
      if (!data) {
        this.log('No cached data available')
        return null
      }

      return data
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

  /**
   * Force refresh the cache (local mode only)
   * Fetches from service and writes to cache, waiting for write to complete
   */
  async refreshCache(): Promise<SyncResult> {
    if (!this.isLocal()) {
      return { success: false, recordsWritten: 0, error: 'Cache refresh only available in local mode' }
    }

    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    this.log('Force refreshing cache')

    try {
      const data = await this.fetchFromService()
      const result = await this.writeToCache(data)
      
      await this.logSync(result.success ? 'success' : 'error', result.recordsWritten, result.error)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logSync('error', 0, errorMessage)
      return { success: false, recordsWritten: 0, error: errorMessage }
    }
  }
}

/**
 * Utility function to safely parse JSON from Supabase
 */
export function parseJsonSafe<T>(data: unknown, fallback: T): T {
  if (data === null || data === undefined) return fallback
  if (typeof data === 'object') return data as T
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

/**
 * Utility function to get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}
