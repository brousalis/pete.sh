/**
 * Spotify Listening History Service
 * Handles syncing and retrieving Spotify listening history from Supabase
 */

import {
  getSupabaseClient,
  getSupabaseServiceClient,
  isSupabaseConfigured,
} from '@/lib/supabase/client'
import type { SpotifySyncCursorInsert } from '@/lib/supabase/types'
import type {
  SpotifyHistorySyncResult,
  SpotifyListeningHistoryEntry,
  SpotifyListeningStats,
  SpotifyRecentTrack,
  SpotifySyncCursor,
} from '@/lib/types/spotify.types'
import { SpotifyService } from './spotify.service'

export class SpotifyHistoryService {
  private spotifyService: SpotifyService | null = null

  constructor(spotifyService?: SpotifyService) {
    this.spotifyService = spotifyService || null
  }

  /**
   * Set the authenticated Spotify service for API calls
   */
  setSpotifyService(spotifyService: SpotifyService): void {
    this.spotifyService = spotifyService
  }

  /**
   * Check if the service is configured (Supabase available)
   */
  isConfigured(): boolean {
    return isSupabaseConfigured()
  }

  /**
   * Get the best client for reads: service role when available (so server-side
   * reads see the same data as writes), otherwise anon. Fixes mismatch where
   * sync inserts with service role but getHistory/getTotalTrackCount used anon
   * and could see 0 rows due to RLS or missing anon policy.
   */
  private getReadClient() {
    return getSupabaseServiceClient() ?? getSupabaseClient()
  }

  /**
   * Sync recent plays from Spotify API to Supabase
   * Returns the number of new tracks added
   */
  async syncRecentPlays(): Promise<SpotifyHistorySyncResult> {
    if (!this.spotifyService) {
      return {
        success: false,
        newTracks: 0,
        totalTracksInDb: 0,
        error: 'Spotify service not initialized',
      }
    }

    const serviceClient = getSupabaseServiceClient()
    if (!serviceClient) {
      return {
        success: false,
        newTracks: 0,
        totalTracksInDb: 0,
        error: 'Supabase service client not available',
      }
    }

    try {
      // Get the sync cursor to know where we left off
      const cursor = await this.getSyncCursor()

      // Fetch recent plays from Spotify (max 50)
      // Note: Spotify's recently-played endpoint only returns last 50 tracks
      const recentPlays = await this.spotifyService.getRecentlyPlayed(50)

      if (!recentPlays.items || recentPlays.items.length === 0) {
        return {
          success: true,
          newTracks: 0,
          totalTracksInDb: await this.getTotalTrackCount(),
        }
      }

      // Filter out tracks we've already synced
      const newTracks = cursor.last_played_at
        ? recentPlays.items.filter(
            item => new Date(item.played_at) > new Date(cursor.last_played_at!)
          )
        : recentPlays.items

      if (newTracks.length === 0) {
        return {
          success: true,
          newTracks: 0,
          totalTracksInDb: await this.getTotalTrackCount(),
        }
      }

      // Transform and insert new tracks
      const historyEntries = newTracks.map(item =>
        this.transformToHistoryEntry(item)
      )

      // Upsert to handle any potential duplicates
      const { error } = await serviceClient
        .from('spotify_listening_history')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase Insert inferred as never for this table
        .upsert(historyEntries as any, {
          onConflict: 'track_id,played_at',
          ignoreDuplicates: true,
        })

      if (error) {
        // Only log if it's not a "table doesn't exist" error (which is expected before migration)
        if (error.code !== 'PGRST205') {
          console.error('[SpotifyHistory] Insert error:', error)
        }
        return {
          success: false,
          newTracks: 0,
          totalTracksInDb: 0,
          error:
            error.code === 'PGRST205'
              ? 'Table not found - run migration 004_spotify_listening_history.sql'
              : error.message,
        }
      }

      // Update the sync cursor
      const newestPlayedAt = newTracks[0]?.played_at
      if (newestPlayedAt) {
        await this.updateSyncCursor(newestPlayedAt, historyEntries.length)
      }

      const totalInDb = await this.getTotalTrackCount()

      return {
        success: true,
        newTracks: historyEntries.length,
        totalTracksInDb: totalInDb,
        oldestTrack: historyEntries[historyEntries.length - 1]?.played_at,
        newestTrack: historyEntries[0]?.played_at,
      }
    } catch (error) {
      console.error('[SpotifyHistory] Sync error:', error)
      return {
        success: false,
        newTracks: 0,
        totalTracksInDb: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get listening history from Supabase
   */
  async getHistory(options?: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  }): Promise<SpotifyListeningHistoryEntry[]> {
    const client = this.getReadClient()
    if (!client) return []

    const { limit = 50, offset = 0, startDate, endDate } = options || {}

    let query = client
      .from('spotify_listening_history')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (startDate) {
      query = query.gte('played_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('played_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      // Don't log "table doesn't exist" errors - expected before migration
      if (error.code !== 'PGRST205') {
        console.error('[SpotifyHistory] Get history error:', error)
      }
      return []
    }

    return (data as SpotifyListeningHistoryEntry[]) || []
  }

  /**
   * Get listening stats for a time period
   */
  async getStats(days = 30): Promise<SpotifyListeningStats | null> {
    const client = this.getReadClient()
    if (!client) return null

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    try {
      // Get total and unique counts
      const { data: rawData, error: historyError } = await client
        .from('spotify_listening_history')
        .select('track_id, track_name, track_artists, duration_ms')
        .gte('played_at', sinceDate.toISOString())

      if (historyError || !rawData) {
        // Don't log "table doesn't exist" errors - expected before migration
        if (historyError?.code !== 'PGRST205') {
          console.error('[SpotifyHistory] Stats error:', historyError)
        }
        return null
      }

      type StatsRow = {
        track_id: string
        track_name: string
        track_artists: string
        duration_ms: number
      }
      const historyData = rawData as StatsRow[]

      // Calculate stats in memory
      const totalTracks = historyData.length
      const uniqueTracks = new Set(historyData.map(t => t.track_id)).size
      const uniqueArtists = new Set(historyData.map(t => t.track_artists)).size
      const totalListeningTimeMs = historyData.reduce(
        (sum, t) => sum + (t.duration_ms || 0),
        0
      )

      // Find top track
      const trackCounts = new Map<string, number>()
      historyData.forEach(t => {
        trackCounts.set(t.track_name, (trackCounts.get(t.track_name) || 0) + 1)
      })
      let topTrack: string | undefined
      let topTrackCount = 0
      trackCounts.forEach((count, name) => {
        if (count > topTrackCount) {
          topTrackCount = count
          topTrack = name
        }
      })

      // Find top artist
      const artistCounts = new Map<string, number>()
      historyData.forEach(t => {
        artistCounts.set(
          t.track_artists,
          (artistCounts.get(t.track_artists) || 0) + 1
        )
      })
      let topArtist: string | undefined
      let topArtistCount = 0
      artistCounts.forEach((count, name) => {
        if (count > topArtistCount) {
          topArtistCount = count
          topArtist = name
        }
      })

      return {
        total_tracks: totalTracks,
        unique_tracks: uniqueTracks,
        unique_artists: uniqueArtists,
        total_listening_time_ms: totalListeningTimeMs,
        top_track: topTrack,
        top_track_count: topTrackCount,
        top_artist: topArtist,
        top_artist_count: topArtistCount,
      }
    } catch (error: unknown) {
      // Don't log "table doesn't exist" errors - expected before migration
      const pgError = error as { code?: string }
      if (pgError?.code !== 'PGRST205') {
        console.error('[SpotifyHistory] Stats error:', error)
      }
      return null
    }
  }

  /**
   * Get the sync cursor
   */
  async getSyncCursor(): Promise<SpotifySyncCursor> {
    const client = this.getReadClient()
    const defaultCursor: SpotifySyncCursor = {
      id: 'default',
      last_played_at: null,
      last_sync_at: new Date().toISOString(),
      total_tracks_synced: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!client) return defaultCursor

    const { data, error } = await client
      .from('spotify_sync_cursor')
      .select('*')
      .eq('id', 'default')
      .single()

    if (error || !data) {
      return defaultCursor
    }

    return data as SpotifySyncCursor
  }

  /**
   * Update the sync cursor after successful sync
   */
  private async updateSyncCursor(
    lastPlayedAt: string,
    newTracksCount: number
  ): Promise<void> {
    const serviceClient = getSupabaseServiceClient()
    if (!serviceClient) return

    const cursor = await this.getSyncCursor()

    const cursorPayload: SpotifySyncCursorInsert = {
      id: 'default',
      last_played_at: lastPlayedAt,
      last_sync_at: new Date().toISOString(),
      total_tracks_synced: cursor.total_tracks_synced + newTracksCount,
      updated_at: new Date().toISOString(),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase Insert inferred as never for this table
    await serviceClient.from('spotify_sync_cursor').upsert(cursorPayload as any)
  }

  /**
   * Get total track count in the history
   */
  private async getTotalTrackCount(): Promise<number> {
    const client = this.getReadClient()
    if (!client) return 0

    const { count, error } = await client
      .from('spotify_listening_history')
      .select('*', { count: 'exact', head: true })

    if (error) return 0
    return count || 0
  }

  /**
   * Transform a Spotify recent track to a history entry
   */
  private transformToHistoryEntry(
    item: SpotifyRecentTrack
  ): Omit<SpotifyListeningHistoryEntry, 'id' | 'created_at' | 'synced_at'> {
    const track = item.track
    return {
      track_id: track.id,
      track_uri: track.uri,
      track_name: track.name,
      track_artists: track.artists.map(a => a.name).join(', '),
      track_artist_ids: track.artists.map(a => a.id).join(', '),
      album_name: track.album.name,
      album_id: track.album.id,
      album_image_url: track.album.images?.[0]?.url ?? undefined,
      duration_ms: track.duration_ms,
      context_type: item.context?.type ?? undefined,
      context_uri: item.context?.uri ?? undefined,
      played_at: item.played_at,
    }
  }

  /**
   * Get tracks grouped by day for a given time period
   */
  async getHistoryByDay(
    days = 7
  ): Promise<Map<string, SpotifyListeningHistoryEntry[]>> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const history = await this.getHistory({
      startDate,
      limit: 500, // Get more for grouping
    })

    const byDay = new Map<string, SpotifyListeningHistoryEntry[]>()

    history.forEach(entry => {
      const date = new Date(entry.played_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      if (!byDay.has(date)) {
        byDay.set(date, [])
      }
      byDay.get(date)!.push(entry)
    })

    return byDay
  }
}

// Singleton instance
let historyServiceInstance: SpotifyHistoryService | null = null

export function getSpotifyHistoryService(): SpotifyHistoryService {
  if (!historyServiceInstance) {
    historyServiceInstance = new SpotifyHistoryService()
  }
  return historyServiceInstance
}
