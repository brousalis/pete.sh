/**
 * Concerts Adapter
 * Handles concert data with Supabase as the primary store.
 *
 * Unlike other adapters that bridge a local hardware service to Supabase,
 * the concerts adapter uses Supabase directly as the source of truth in all modes.
 * The "local vs production" distinction here is:
 * - Local: full read/write access, calendar sync available
 * - Production: read-only from Supabase
 */

import { BaseAdapter, type SyncResult } from './base.adapter'
import { ConcertsService } from '@/lib/services/concerts.service'
import type { Concert, ConcertListResponse, ConcertFilters } from '@/lib/types/concerts.types'

export interface ConcertsFullState {
  concerts: Concert[]
  total: number
}

export interface ConcertsCachedState {
  concerts: Concert[]
  total: number
}

export class ConcertsAdapter extends BaseAdapter<ConcertsFullState, ConcertsCachedState> {
  private service: ConcertsService

  constructor(debug: boolean = false) {
    super({ serviceName: 'concerts', debug })
    this.service = new ConcertsService()
  }

  isConfigured(): boolean {
    return this.isSupabaseAvailable()
  }

  /**
   * Concerts are always "available" since they use Supabase directly.
   * We mark as available if Supabase is configured.
   */
  protected async checkServiceAvailability(): Promise<boolean> {
    return this.isSupabaseAvailable()
  }

  /**
   * Get the underlying service for direct operations
   */
  getService(): ConcertsService {
    return this.service
  }

  /**
   * Fetch concerts (used by adapter base class)
   */
  protected async fetchFromService(): Promise<ConcertsFullState> {
    const result = await this.service.getConcerts({ sort: 'date_desc', limit: 200 })
    return {
      concerts: result.concerts,
      total: result.total,
    }
  }

  /**
   * Read from cache (for concerts, this is the same as fetchFromService since Supabase IS the store)
   */
  protected async fetchFromCache(): Promise<ConcertsCachedState | null> {
    try {
      const result = await this.service.getConcerts({ sort: 'date_desc', limit: 200 })
      return {
        concerts: result.concerts,
        total: result.total,
      }
    } catch {
      return null
    }
  }

  /**
   * Write to cache (no-op for concerts since Supabase is the primary store)
   */
  protected async writeToCache(): Promise<SyncResult> {
    return { success: true, recordsWritten: 0, skipped: true }
  }

  /**
   * Get concerts with filters
   */
  async getConcerts(filters: ConcertFilters = {}): Promise<ConcertListResponse> {
    return this.service.getConcerts(filters)
  }

  /**
   * Get a single concert by ID
   */
  async getConcert(id: string): Promise<Concert | null> {
    return this.service.getConcert(id)
  }
}

/** Singleton adapter instance */
let concertsAdapter: ConcertsAdapter | null = null

export function getConcertsAdapter(): ConcertsAdapter {
  if (!concertsAdapter) {
    concertsAdapter = new ConcertsAdapter()
  }
  return concertsAdapter
}
