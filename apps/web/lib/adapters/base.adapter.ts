/**
 * Base Adapter
 * Provides common functionality for all service adapters
 * 
 * The adapter pattern allows seamless switching between:
 * - Local mode: Fetch from real service + write to Supabase (auto-detected)
 * - Production mode: Read from Supabase cache (fallback when services unreachable)
 * 
 * Mode is auto-detected by attempting to reach local services.
 * No DEPLOYMENT_MODE env var required.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, getSupabaseServiceClient, isSupabaseConfigured, hasServiceRoleKey } from '@/lib/supabase/client'
import type { Database, ServiceName } from '@/lib/supabase/types'

// ============================================
// Server-side Connectivity Detection
// ============================================

interface ServiceAvailability {
  available: boolean
  checkedAt: Date
  error?: string
}

/** Cache of service availability checks */
const serviceAvailabilityCache = new Map<ServiceName, ServiceAvailability>()

/** Cache of last write timestamps for change detection */
const lastWriteTimestampCache = new Map<ServiceName, Date>()

/** Cache of last written data hash for change detection */
const lastWriteDataHashCache = new Map<ServiceName, string>()

/** How long to cache availability results (ms) */
const AVAILABILITY_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Timeout for availability checks (ms) */
export const AVAILABILITY_CHECK_TIMEOUT = 2000 // 2 seconds

/** Default minimum write intervals per service (ms) */
const DEFAULT_MIN_WRITE_INTERVALS: Record<ServiceName, number> = {
  hue: 5 * 60 * 1000,      // 5 minutes
  spotify: 1 * 60 * 1000,  // 1 minute
  cta: 5 * 60 * 1000,      // 5 minutes
  calendar: 5 * 60 * 1000, // 5 minutes
  fitness: 5 * 60 * 1000,  // 5 minutes
}

/**
 * Check if a cached availability result is still valid
 */
function isAvailabilityCacheValid(serviceName: ServiceName): boolean {
  const cached = serviceAvailabilityCache.get(serviceName)
  if (!cached) return false
  
  const age = Date.now() - cached.checkedAt.getTime()
  return age < AVAILABILITY_CACHE_TTL
}

/**
 * Get global service availability status (for health endpoint)
 */
export function getServiceAvailabilityStatus(): Record<ServiceName, ServiceAvailability | null> {
  const result: Record<string, ServiceAvailability | null> = {}
  const services: ServiceName[] = ['hue', 'spotify', 'cta', 'calendar', 'fitness']
  
  for (const service of services) {
    result[service] = serviceAvailabilityCache.get(service) ?? null
  }
  
  return result as Record<ServiceName, ServiceAvailability | null>
}

/**
 * Check if any local service is available (for mode detection)
 */
export function isAnyLocalServiceAvailable(): boolean {
  for (const [, status] of serviceAvailabilityCache) {
    if (status.available) return true
  }
  return false
}

/**
 * Clear the availability cache (for testing or manual refresh)
 */
export function clearAvailabilityCache(): void {
  serviceAvailabilityCache.clear()
}

/**
 * Clear all write timestamp caches (for testing or manual refresh)
 */
export function clearWriteTimestampCaches(): void {
  lastWriteTimestampCache.clear()
  lastWriteDataHashCache.clear()
}

/**
 * Get write statistics for a service
 */
export function getWriteStats(serviceName: ServiceName): {
  lastWriteTime: Date | null
  timeSinceLastWrite: number | null
} {
  const lastWrite = lastWriteTimestampCache.get(serviceName)
  return {
    lastWriteTime: lastWrite ?? null,
    timeSinceLastWrite: lastWrite ? Date.now() - lastWrite.getTime() : null,
  }
}

// ============================================
// Adapter Types
// ============================================

export interface AdapterConfig {
  /** Service name for logging and sync tracking */
  serviceName: ServiceName
  /** Whether to log operations */
  debug?: boolean
  /** Minimum interval between cache writes (ms). Overrides default for this service. */
  minWriteInterval?: number
  /** Whether to enable change detection (default: true) */
  enableChangeDetection?: boolean
}

export interface SyncResult {
  success: boolean
  recordsWritten: number
  error?: string
  /** Whether the write was skipped due to no changes */
  skipped?: boolean
}

/**
 * Base adapter class that all service adapters extend
 */
export abstract class BaseAdapter<TServiceData, TCachedData> {
  protected serviceName: ServiceName
  protected debug: boolean
  protected minWriteInterval: number
  protected enableChangeDetection: boolean
  
  /** Cached availability status for this adapter instance */
  private localAvailable: boolean | null = null

  constructor(config: AdapterConfig) {
    this.serviceName = config.serviceName
    this.debug = config.debug ?? false
    this.minWriteInterval = config.minWriteInterval ?? DEFAULT_MIN_WRITE_INTERVALS[config.serviceName]
    this.enableChangeDetection = config.enableChangeDetection ?? true
  }

  // ============================================
  // Change Detection Methods
  // ============================================

  /**
   * Get the minimum interval between cache writes (ms)
   * Can be overridden by subclasses for custom behavior
   */
  protected getMinWriteInterval(): number {
    return this.minWriteInterval
  }

  /**
   * Compute a hash/fingerprint of the data for change detection
   * Override in subclasses for more efficient comparison
   * @param data The data to hash
   * @returns A string hash of the data
   */
  protected computeDataHash(data: TServiceData): string {
    // Default implementation: JSON stringify
    // Subclasses should override for more efficient comparison
    try {
      return JSON.stringify(data)
    } catch {
      return Date.now().toString() // Fallback to always write
    }
  }

  /**
   * Check if the data has changed since the last write
   * @param newData The new data to compare
   * @returns true if data has changed or no previous data exists
   */
  protected hasDataChanged(newData: TServiceData): boolean {
    const lastHash = lastWriteDataHashCache.get(this.serviceName)
    if (!lastHash) return true

    const newHash = this.computeDataHash(newData)
    return lastHash !== newHash
  }

  /**
   * Get the time since the last write (ms)
   * @returns Time in ms since last write, or Infinity if never written
   */
  protected getTimeSinceLastWrite(): number {
    const lastWrite = lastWriteTimestampCache.get(this.serviceName)
    if (!lastWrite) return Infinity
    return Date.now() - lastWrite.getTime()
  }

  /**
   * Determine if we should write to cache based on change detection
   * Writes if:
   * - Change detection is disabled, OR
   * - Data has changed, OR
   * - Enough time has passed since last write (for periodic snapshots)
   * 
   * @param newData The new data to potentially write
   * @returns true if we should write to cache
   */
  protected shouldWriteToCache(newData: TServiceData): boolean {
    if (!this.enableChangeDetection) {
      return true
    }

    const timeSinceLastWrite = this.getTimeSinceLastWrite()
    const minInterval = this.getMinWriteInterval()

    // Always write if enough time has passed (for historical snapshots)
    if (timeSinceLastWrite >= minInterval) {
      this.log(`Time-based write: ${Math.round(timeSinceLastWrite / 1000)}s since last write (min: ${Math.round(minInterval / 1000)}s)`)
      return true
    }

    // Write if data has changed
    if (this.hasDataChanged(newData)) {
      this.log('Data changed, writing to cache')
      return true
    }

    this.log(`Skipping write: no changes and only ${Math.round(timeSinceLastWrite / 1000)}s since last write`)
    return false
  }

  /**
   * Record that we just wrote to cache
   * @param data The data that was written (for hash computation)
   */
  protected recordWriteTimestamp(data: TServiceData): void {
    lastWriteTimestampCache.set(this.serviceName, new Date())
    if (this.enableChangeDetection) {
      lastWriteDataHashCache.set(this.serviceName, this.computeDataHash(data))
    }
  }

  /**
   * Clear the write timestamp cache (useful for testing)
   */
  clearWriteTimestampCache(): void {
    lastWriteTimestampCache.delete(this.serviceName)
    lastWriteDataHashCache.delete(this.serviceName)
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

  // ============================================
  // Auto-Detection Methods
  // ============================================

  /**
   * Abstract method to check if the local service is reachable
   * Each adapter implements this with a quick ping to their service
   * Should timeout quickly (< 2 seconds)
   */
  protected abstract checkServiceAvailability(): Promise<boolean>

  /**
   * Check if local service is available (with caching)
   */
  protected async isLocalServiceAvailable(): Promise<boolean> {
    // Check instance cache first (for multiple calls in same request)
    if (this.localAvailable !== null) {
      return this.localAvailable
    }

    // Check global cache
    if (isAvailabilityCacheValid(this.serviceName)) {
      const cached = serviceAvailabilityCache.get(this.serviceName)!
      this.localAvailable = cached.available
      return cached.available
    }

    // Perform actual check
    this.log('Checking local service availability...')
    
    try {
      const available = await this.checkServiceAvailability()
      
      // Cache the result
      serviceAvailabilityCache.set(this.serviceName, {
        available,
        checkedAt: new Date(),
      })
      this.localAvailable = available
      
      this.log(`Local service ${available ? 'available' : 'unavailable'}`)
      return available
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Cache the failure
      serviceAvailabilityCache.set(this.serviceName, {
        available: false,
        checkedAt: new Date(),
        error: errorMessage,
      })
      this.localAvailable = false
      
      this.log(`Local service check failed: ${errorMessage}`)
      return false
    }
  }

  /**
   * Check if running in local mode (service available)
   * Auto-detects based on service reachability
   */
  protected async isLocal(): Promise<boolean> {
    return this.isLocalServiceAvailable()
  }

  /**
   * Check if running in production mode (service unavailable)
   * Auto-detects based on service reachability
   */
  protected async isProduction(): Promise<boolean> {
    return !(await this.isLocalServiceAvailable())
  }

  /**
   * Synchronous check if local - uses cached value
   * Returns false if no cached value (assumes production until proven otherwise)
   */
  protected isLocalSync(): boolean {
    if (this.localAvailable !== null) {
      return this.localAvailable
    }
    
    const cached = serviceAvailabilityCache.get(this.serviceName)
    if (cached && isAvailabilityCacheValid(this.serviceName)) {
      return cached.available
    }
    
    // Default to false (production) if not yet checked
    return false
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from('sync_log') as any).insert({
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client.from('sync_log') as any)
        .select('synced_at')
        .eq('service', this.serviceName)
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null
      return new Date((data as { synced_at: string }).synced_at)
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
   * Auto-detects mode:
   * - If local service reachable: fetches from service and writes to cache
   * - If local service unreachable: reads from cache
   */
  async getData(): Promise<TServiceData | TCachedData | null> {
    const isLocalAvailable = await this.isLocal()
    
    if (isLocalAvailable) {
      return this.getDataLocal()
    }
    return this.getDataProduction()
  }

  /**
   * Get data in local mode
   * Fetches from real service and optionally writes to Supabase based on change detection
   */
  protected async getDataLocal(): Promise<TServiceData | null> {
    this.log('Fetching from real service (local mode)')

    try {
      const data = await this.fetchFromService()
      
      // Write to cache in background only if change detection passes
      if (this.isSupabaseAvailable() && this.shouldWriteToCache(data)) {
        this.writeToCache(data)
          .then((result) => {
            if (result.success) {
              this.log(`Cached ${result.recordsWritten} records`)
              this.recordWriteTimestamp(data)
            } else if (!result.skipped) {
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
      
      // On service error, try falling back to cache
      this.log('Service error, attempting cache fallback...')
      if (this.isSupabaseAvailable()) {
        try {
          const cached = await this.fetchFromCache()
          if (cached) {
            this.log('Using cached data as fallback')
            return cached as TServiceData
          }
        } catch {
          // Cache fallback also failed
        }
      }
      
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
   * This method bypasses change detection for explicit sync operations
   */
  async refreshCache(): Promise<SyncResult> {
    const isLocalAvailable = await this.isLocal()
    
    if (!isLocalAvailable) {
      return { success: false, recordsWritten: 0, error: 'Cache refresh only available when local services are reachable' }
    }

    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    this.log('Force refreshing cache')

    try {
      const data = await this.fetchFromService()
      
      // For explicit sync, check if we should write (respects min interval but always writes on change)
      if (!this.shouldWriteToCache(data)) {
        this.log('Skipping cache write - no changes detected')
        return { success: true, recordsWritten: 0, skipped: true }
      }

      const result = await this.writeToCache(data)
      
      if (result.success) {
        this.recordWriteTimestamp(data)
      }
      
      await this.logSync(result.success ? 'success' : 'error', result.recordsWritten, result.error)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logSync('error', 0, errorMessage)
      return { success: false, recordsWritten: 0, error: errorMessage }
    }
  }

  /**
   * Force refresh the cache, bypassing change detection
   * Use sparingly - this writes regardless of whether data has changed
   */
  async forceRefreshCache(): Promise<SyncResult> {
    const isLocalAvailable = await this.isLocal()
    
    if (!isLocalAvailable) {
      return { success: false, recordsWritten: 0, error: 'Cache refresh only available when local services are reachable' }
    }

    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    this.log('Force refreshing cache (bypassing change detection)')

    try {
      const data = await this.fetchFromService()
      const result = await this.writeToCache(data)
      
      if (result.success) {
        this.recordWriteTimestamp(data)
      }
      
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
