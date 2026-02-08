/**
 * CTA Adapter
 * Handles Chicago Transit Authority data with historical recording
 * 
 * CTA data is always fetched from the real API when available (public API).
 * Supabase is used for historical data storage and as a fallback.
 * 
 * History Recording Strategy:
 * - Frontend polls do NOT record history (they just fetch fresh data)
 * - Background sync operations record history with change detection
 * - History is only written when prediction data meaningfully changes
 *   or when the minimum write interval (5 minutes) has passed
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { CTAService } from '@/lib/services/cta.service'
import type {
  CTABusResponse,
  CTATrainResponse,
  CTARouteConfig,
  CTABusPrediction,
} from '@/lib/types/cta.types'
import type { CTAHistoryRow, CTAHistoryInsert } from '@/lib/supabase/types'

export interface CTAFullState {
  bus: Record<string, CTABusResponse>
  train: Record<string, CTATrainResponse>
}

export interface CTACachedState {
  bus: Record<string, CTABusResponse>
  train: Record<string, CTATrainResponse>
  recordedAt: string
}

// Default route configuration
const DEFAULT_ROUTE_CONFIG: CTARouteConfig = {
  bus: [
    { route: '76', stopId: '11031', direction: 'Eastbound' },
    { route: '22', stopId: '18173', direction: 'Southbound' },
    { route: '36', stopId: '18173', direction: 'Southbound' },
  ],
  train: [
    { line: 'Brn', stationId: '40530', direction: 'Southbound' },
    { line: 'P', stationId: '40530', direction: 'Southbound' },
  ],
}

/**
 * CTA Adapter - manages transit prediction data
 * 
 * Note: CTA is a public API, so we always try to fetch from it
 * regardless of "local mode". Supabase is used for historical
 * data storage and as a fallback.
 * 
 * History is only recorded during explicit sync operations, not on
 * every frontend poll. This prevents excessive data accumulation.
 */
export class CTAAdapter extends BaseAdapter<CTAFullState, CTACachedState> {
  private ctaService: CTAService
  private routeConfig: CTARouteConfig

  constructor(routeConfig?: CTARouteConfig, debug: boolean = false) {
    // 5 minute minimum write interval for CTA history
    super({ serviceName: 'cta', debug, minWriteInterval: 5 * 60 * 1000 })
    this.ctaService = new CTAService()
    this.routeConfig = routeConfig ?? DEFAULT_ROUTE_CONFIG
  }

  /**
   * Compute a hash of CTA data based on meaningful changes
   * Only considers the arrival times and number of predictions,
   * not the full response which includes timestamps that always change
   */
  protected computeDataHash(data: CTAFullState): string {
    const significantData = {
      bus: Object.entries(data.bus).map(([route, response]) => ({
        route,
        predictions: response['bustime-response']?.prd?.map(p => ({
          rt: p.rt,
          prdtm: p.prdtm,
          vid: p.vid,
        })) ?? [],
        hasError: !!response['bustime-response']?.error,
      })),
      train: Object.entries(data.train).map(([line, response]) => ({
        line,
        predictions: response.ctatt?.eta?.map(e => ({
          rt: e.rt,
          arrT: e.arrT,
          rn: e.rn,
        })) ?? [],
        hasError: response.ctatt?.errCd !== '0',
      })),
    }
    return JSON.stringify(significantData)
  }

  /**
   * Check if CTA service is configured (has API key)
   */
  isConfigured(): boolean {
    return this.ctaService.isConfigured()
  }

  /**
   * Check if CTA API is reachable
   * Since CTA is a public API, this always returns true if configured
   */
  protected async checkServiceAvailability(): Promise<boolean> {
    // CTA is a public API - always available if configured
    // The actual reachability is handled per-request with fallback to cache
    return this.isConfigured()
  }

  /**
   * Update the route configuration
   */
  setRouteConfig(config: CTARouteConfig): void {
    this.routeConfig = config
  }

  /**
   * Fetch all CTA data from the API
   */
  protected async fetchFromService(): Promise<CTAFullState> {
    return this.ctaService.getAllRoutes(this.routeConfig)
  }

  /**
   * Fetch cached CTA data from Supabase (historical)
   */
  protected async fetchFromCache(): Promise<CTACachedState | null> {
    const client = this.getReadClient()
    if (!client) return null // Supabase not configured

    try {
      // Get the most recent records for each route
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client.from('cta_history') as any)
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20) // Get recent history

      if (error) throw error
      if (!data || data.length === 0) return null

      const rows = data as CTAHistoryRow[]

      // Group by route and take the latest for each
      const busMap = new Map<string, CTAHistoryRow>()
      const trainMap = new Map<string, CTAHistoryRow>()

      for (const row of rows) {
        if (row.route_type === 'bus' && !busMap.has(row.route)) {
          busMap.set(row.route, row)
        } else if (row.route_type === 'train' && !trainMap.has(row.route)) {
          trainMap.set(row.route, row)
        }
      }

      // Convert to response format
      const bus: Record<string, CTABusResponse> = {}
      for (const [route, row] of busMap) {
        if (row.error_message) {
          bus[route] = {
            'bustime-response': {
              error: [{ rt: route, msg: row.error_message }],
            },
          }
        } else {
          bus[route] = {
            'bustime-response': {
              prd: row.predictions as CTABusPrediction[] ?? [],
            },
          }
        }
      }

      const train: Record<string, CTATrainResponse> = {}
      for (const [line, row] of trainMap) {
        if (row.error_message) {
          train[line] = {
            ctatt: {
              tmst: row.recorded_at,
              errCd: '1',
              errNm: row.error_message,
              eta: [],
            },
          }
        } else {
          train[line] = {
            ctatt: {
              tmst: row.recorded_at,
              errCd: '0',
              errNm: null,
              eta: (row.predictions as CTATrainResponse['ctatt']['eta']) ?? [],
            },
          }
        }
      }

      const recordedAt = rows[0]?.recorded_at ?? new Date().toISOString()

      return { bus, train, recordedAt }
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

  /**
   * Write CTA data to Supabase history
   */
  protected async writeToCache(data: CTAFullState): Promise<SyncResult> {
    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    const timestamp = getCurrentTimestamp()
    let recordsWritten = 0

    try {
      const inserts: CTAHistoryInsert[] = []

      // Add bus predictions
      for (const [route, response] of Object.entries(data.bus)) {
        const config = this.routeConfig.bus.find(b => b.route === route)
        const error = response['bustime-response']?.error?.[0]
        
        inserts.push({
          route_type: 'bus',
          route,
          stop_id: config?.stopId ?? null,
          station_id: null,
          direction: config?.direction ?? null,
          predictions: error ? null : response['bustime-response']?.prd ?? [],
          error_message: error?.msg ?? null,
          recorded_at: timestamp,
        })
      }

      // Add train predictions
      for (const [line, response] of Object.entries(data.train)) {
        const config = this.routeConfig.train.find(t => t.line === line)
        const hasError = response.ctatt?.errCd !== '0'
        
        inserts.push({
          route_type: 'train',
          route: line,
          stop_id: null,
          station_id: config?.stationId ?? null,
          direction: config?.direction ?? null,
          predictions: hasError ? null : response.ctatt?.eta ?? [],
          error_message: hasError ? response.ctatt?.errNm : null,
          recorded_at: timestamp,
        })
      }

      if (inserts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (client.from('cta_history') as any).insert(inserts)
        if (error) throw error
        recordsWritten = inserts.length
      }

      return { success: true, recordsWritten }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logError('Error writing to cache', error)
      return { success: false, recordsWritten, error: errorMessage }
    }
  }

  // ==========================================
  // High-level API methods
  // ==========================================

  /**
   * Get all routes data
   * Always tries to fetch from CTA API first (it's a public API)
   * 
   * @param config Optional route configuration
   * @param recordHistory If true, records data to history (only for explicit sync operations)
   *                      Default is false - frontend polls should NOT record history
   */
  async getAllRoutes(config?: CTARouteConfig, recordHistory = false): Promise<CTAFullState> {
    const routeConfig = config ?? this.routeConfig

    try {
      // Always try to fetch from real API first
      const data = await this.ctaService.getAllRoutes(routeConfig)
      
      // Only record history when explicitly requested (during sync operations)
      // and only if change detection passes
      if (recordHistory && this.isSupabaseAvailable()) {
        if (this.shouldWriteToCache(data)) {
          this.writeToCache(data)
            .then(result => {
              if (result.success) {
                this.recordWriteTimestamp(data)
                this.log(`Recorded ${result.recordsWritten} CTA history entries`)
              }
            })
            .catch(err => this.logError('Failed to record CTA history', err))
        } else {
          this.log('Skipping CTA history write - no significant changes')
        }
      }

      return data
    } catch (error) {
      this.logError('Error fetching from CTA API', error)
      
      // Fall back to cached data if available
      if (this.isSupabaseAvailable()) {
        const cached = await this.fetchFromCache()
        if (cached) {
          this.log('Using cached CTA data')
          return { bus: cached.bus, train: cached.train }
        }
      }

      throw error
    }
  }

  /**
   * Get bus predictions for a specific route
   * Note: Does NOT record to history - use getAllRoutes with recordHistory=true for that
   */
  async getBusPredictions(route: string, stopId: string): Promise<CTABusResponse> {
    try {
      return await this.ctaService.getBusPredictions(route, stopId)
    } catch (error) {
      this.logError('Error fetching bus predictions', error)
      throw error
    }
  }

  /**
   * Get train predictions for a specific line
   * Note: Does NOT record to history - use getAllRoutes with recordHistory=true for that
   */
  async getTrainPredictions(line: string, stationId: string): Promise<CTATrainResponse> {
    try {
      return await this.ctaService.getTrainPredictions(line, stationId)
    } catch (error) {
      this.logError('Error fetching train predictions', error)
      throw error
    }
  }

  /**
   * Sync CTA data to history (for background sync operations)
   * Uses change detection to avoid writing duplicate data
   */
  async syncToHistory(): Promise<SyncResult> {
    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    try {
      const data = await this.ctaService.getAllRoutes(this.routeConfig)
      
      if (!this.shouldWriteToCache(data)) {
        this.log('Skipping CTA history sync - no significant changes')
        return { success: true, recordsWritten: 0, skipped: true }
      }

      const result = await this.writeToCache(data)
      
      if (result.success) {
        this.recordWriteTimestamp(data)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logError('Error syncing CTA history', error)
      return { success: false, recordsWritten: 0, error: errorMessage }
    }
  }

  /**
   * Get historical CTA data for analysis
   */
  async getHistory(options?: {
    route?: string
    routeType?: 'bus' | 'train'
    limit?: number
    startDate?: Date
    endDate?: Date
  }): Promise<CTAHistoryRow[]> {
    if (!this.isSupabaseAvailable()) {
      return []
    }

    const client = this.getReadClient()
    if (!client) return [] // Supabase not configured
    
    let query = client
      .from('cta_history')
      .select('*')
      .order('recorded_at', { ascending: false })

    if (options?.route) {
      query = query.eq('route', options.route)
    }
    if (options?.routeType) {
      query = query.eq('route_type', options.routeType)
    }
    if (options?.startDate) {
      query = query.gte('recorded_at', options.startDate.toISOString())
    }
    if (options?.endDate) {
      query = query.lte('recorded_at', options.endDate.toISOString())
    }

    query = query.limit(options?.limit ?? 100)

    const { data, error } = await query

    if (error) {
      this.logError('Error fetching CTA history', error)
      return []
    }

    return (data ?? []) as CTAHistoryRow[]
  }
}

// Export singleton instance
let ctaAdapterInstance: CTAAdapter | null = null

export function getCTAAdapter(): CTAAdapter {
  if (!ctaAdapterInstance) {
    ctaAdapterInstance = new CTAAdapter()
  }
  return ctaAdapterInstance
}
