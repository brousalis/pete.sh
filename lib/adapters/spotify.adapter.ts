/**
 * Spotify Adapter
 * Handles Spotify playback data with write-through caching to Supabase
 * 
 * Local mode: Fetches from Spotify API, writes to Supabase
 * Production mode: Reads from Supabase cache
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { SpotifyService, loadSpotifyTokensFromCookies } from '@/lib/services/spotify.service'
import { cookies } from 'next/headers'
import { config } from '@/lib/config'
import type { 
  SpotifyPlaybackState, 
  SpotifyDevice, 
  SpotifyUser 
} from '@/lib/types/spotify.types'
import type { SpotifyStateRow, SpotifyStateInsert } from '@/lib/supabase/types'

export interface SpotifyFullState {
  playbackState: SpotifyPlaybackState | null
  devices: SpotifyDevice[]
  user: SpotifyUser | null
}

export interface SpotifyCachedState {
  playbackState: SpotifyPlaybackState | null
  devices: SpotifyDevice[]
  user: SpotifyUser | null
  isPlaying: boolean
  currentTrack: {
    name: string | null
    artist: string | null
    album: string | null
    imageUrl: string | null
    progressMs: number | null
    durationMs: number | null
  }
  recordedAt: string
}

/**
 * Spotify Adapter - manages Spotify playback data
 */
export class SpotifyAdapter extends BaseAdapter<SpotifyFullState, SpotifyCachedState> {
  private spotifyService: SpotifyService

  constructor(debug: boolean = false) {
    super({ serviceName: 'spotify', debug })
    this.spotifyService = new SpotifyService()
  }

  /**
   * Check if Spotify is configured
   */
  isConfigured(): boolean {
    return config.spotify.isConfigured
  }

  /**
   * Initialize the service with tokens from cookies
   * Must be called in server context before fetching data
   */
  async initializeWithTokens(): Promise<{ authenticated: boolean; needsRefresh: boolean }> {
    if (!this.isConfigured()) {
      return { authenticated: false, needsRefresh: false }
    }

    const cookieStore = await cookies()
    const { accessToken, refreshToken, needsRefresh } = await loadSpotifyTokensFromCookies(
      this.spotifyService,
      cookieStore
    )

    return {
      authenticated: Boolean(accessToken || refreshToken),
      needsRefresh,
    }
  }

  /**
   * Fetch all Spotify data from the API
   */
  protected async fetchFromService(): Promise<SpotifyFullState> {
    if (!this.isConfigured()) {
      throw new Error('Spotify not configured')
    }

    // Get playback state and devices in parallel
    const [playbackState, devices] = await Promise.all([
      this.spotifyService.getPlaybackState().catch(() => null),
      this.spotifyService.getDevices().catch(() => []),
    ])

    // Try to get user info (might fail if not authenticated)
    let user: SpotifyUser | null = null
    try {
      user = await this.spotifyService.getCurrentUser()
    } catch {
      // User info is optional
    }

    return {
      playbackState,
      devices,
      user,
    }
  }

  /**
   * Fetch cached Spotify data from Supabase
   */
  protected async fetchFromCache(): Promise<SpotifyCachedState | null> {
    const client = this.getReadClient()
    if (!client) return null // Supabase not configured

    try {
      const { data, error } = await client.rpc('get_latest_spotify_state')

      if (error) throw error
      if (!data) return null

      const row = data as SpotifyStateRow

      return {
        playbackState: row.playback_state,
        devices: row.devices ?? [],
        user: row.user_info,
        isPlaying: row.is_playing,
        currentTrack: {
          name: row.current_track_name,
          artist: row.current_track_artist,
          album: row.current_track_album,
          imageUrl: row.current_track_image_url,
          progressMs: row.progress_ms,
          durationMs: row.duration_ms,
        },
        recordedAt: row.recorded_at,
      }
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

  /**
   * Write Spotify data to Supabase
   */
  protected async writeToCache(data: SpotifyFullState): Promise<SyncResult> {
    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    const timestamp = getCurrentTimestamp()

    try {
      const track = data.playbackState?.item
      const insert: SpotifyStateInsert = {
        playback_state: data.playbackState,
        devices: data.devices,
        user_info: data.user,
        is_playing: data.playbackState?.is_playing ?? false,
        current_track_name: track?.name ?? null,
        current_track_artist: track?.artists?.map(a => a.name).join(', ') ?? null,
        current_track_album: track?.album?.name ?? null,
        current_track_image_url: track?.album?.images?.[0]?.url ?? null,
        progress_ms: data.playbackState?.progress_ms ?? null,
        duration_ms: track?.duration_ms ?? null,
        recorded_at: timestamp,
      }

      const { error } = await client.from('spotify_state').insert(insert)

      if (error) throw error

      return { success: true, recordsWritten: 1 }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logError('Error writing to cache', error)
      return { success: false, recordsWritten: 0, error: errorMessage }
    }
  }

  // ==========================================
  // High-level API methods
  // ==========================================

  /**
   * Get current playback state
   */
  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    if (this.isLocal()) {
      try {
        const state = await this.spotifyService.getPlaybackState()
        
        // Write to cache in background
        if (this.isSupabaseAvailable() && state) {
          const devices = await this.spotifyService.getDevices().catch(() => [])
          this.writeToCache({ playbackState: state, devices, user: null })
            .catch(err => this.logError('Failed to cache playback state', err))
        }

        return state
      } catch (error) {
        this.logError('Error fetching playback state', error)
        throw error
      }
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    return cached?.playbackState ?? null
  }

  /**
   * Get available devices
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    if (this.isLocal()) {
      return this.spotifyService.getDevices()
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    return cached?.devices ?? []
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<SpotifyUser | null> {
    if (this.isLocal()) {
      try {
        return await this.spotifyService.getCurrentUser()
      } catch {
        return null
      }
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    return cached?.user ?? null
  }

  /**
   * Get simplified "now playing" info
   * Useful for display widgets
   */
  async getNowPlaying(): Promise<{
    isPlaying: boolean
    track: {
      name: string
      artist: string
      album: string
      imageUrl: string
    } | null
    progressMs: number
    durationMs: number
    recordedAt?: string
  }> {
    if (this.isLocal()) {
      const state = await this.getPlaybackState()
      
      if (!state?.item) {
        return { isPlaying: false, track: null, progressMs: 0, durationMs: 0 }
      }

      return {
        isPlaying: state.is_playing,
        track: {
          name: state.item.name,
          artist: state.item.artists.map(a => a.name).join(', '),
          album: state.item.album.name,
          imageUrl: state.item.album.images[0]?.url ?? '',
        },
        progressMs: state.progress_ms ?? 0,
        durationMs: state.item.duration_ms,
      }
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    
    if (!cached) {
      return { isPlaying: false, track: null, progressMs: 0, durationMs: 0 }
    }

    return {
      isPlaying: cached.isPlaying,
      track: cached.currentTrack.name ? {
        name: cached.currentTrack.name,
        artist: cached.currentTrack.artist ?? '',
        album: cached.currentTrack.album ?? '',
        imageUrl: cached.currentTrack.imageUrl ?? '',
      } : null,
      progressMs: cached.currentTrack.progressMs ?? 0,
      durationMs: cached.currentTrack.durationMs ?? 0,
      recordedAt: cached.recordedAt,
    }
  }

  // ==========================================
  // Mutation methods (local mode only)
  // These delegate to the real service
  // ==========================================

  async play(options?: Parameters<SpotifyService['play']>[0]): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.play(options)
  }

  async pause(deviceId?: string): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.pause(deviceId)
  }

  async skipToNext(deviceId?: string): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.skipToNext(deviceId)
  }

  async skipToPrevious(deviceId?: string): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.skipToPrevious(deviceId)
  }

  async seek(positionMs: number, deviceId?: string): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.seek(positionMs, deviceId)
  }

  async setVolume(volumePercent: number, deviceId?: string): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.setVolume(volumePercent, deviceId)
  }

  async setShuffle(state: boolean, deviceId?: string): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.setShuffle(state, deviceId)
  }

  async transferPlayback(deviceId: string, play?: boolean): Promise<void> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.spotifyService.transferPlayback(deviceId, play)
  }

  // Pass-through methods for auth (always work)
  getAuthUrl(state?: string): string {
    return this.spotifyService.getAuthUrl(state)
  }

  async exchangeCode(code: string) {
    return this.spotifyService.exchangeCode(code)
  }

  async refreshAccessToken(refreshToken: string) {
    return this.spotifyService.refreshAccessToken(refreshToken)
  }

  setCredentials(accessToken: string, refreshToken?: string) {
    this.spotifyService.setCredentials(accessToken, refreshToken)
  }
}

// Export singleton instance
let spotifyAdapterInstance: SpotifyAdapter | null = null

export function getSpotifyAdapter(): SpotifyAdapter {
  if (!spotifyAdapterInstance) {
    spotifyAdapterInstance = new SpotifyAdapter()
  }
  return spotifyAdapterInstance
}
