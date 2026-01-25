/**
 * Sonos Adapter
 * Handles Sonos speaker data with write-through caching to Supabase
 * 
 * Local mode: Fetches from Sonos HTTP API, writes to Supabase
 * Production mode: Reads from Supabase cache
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { SonosService } from '@/lib/services/sonos.service'
import type { SonosPlayer, SonosState, SonosTrack } from '@/lib/types/sonos.types'
import type { SonosStateRow, SonosStateInsert } from '@/lib/supabase/types'

export interface SonosFullState {
  players: SonosPlayer[]
}

export interface SonosCachedState {
  players: SonosStateRow[]
  recordedAt: string
}

/**
 * Sonos Adapter - manages Sonos speaker data
 */
export class SonosAdapter extends BaseAdapter<SonosFullState, SonosCachedState> {
  private sonosService: SonosService

  constructor(debug: boolean = false) {
    super({ serviceName: 'sonos', debug })
    this.sonosService = new SonosService()
  }

  /**
   * Check if Sonos is configured
   */
  isConfigured(): boolean {
    return this.sonosService.isConfigured()
  }

  /**
   * Fetch all Sonos data from the API
   */
  protected async fetchFromService(): Promise<SonosFullState> {
    if (!this.isConfigured()) {
      throw new Error('Sonos not configured')
    }

    const players = await this.sonosService.getPlayers()
    return { players }
  }

  /**
   * Fetch cached Sonos data from Supabase
   */
  protected async fetchFromCache(): Promise<SonosCachedState | null> {
    const client = this.getReadClient()
    if (!client) return null // Supabase not configured

    try {
      // Get distinct players with their latest state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client.from('sonos_state') as any)
        .select('*')
        .order('recorded_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) return null

      // Group by player_id and take the latest for each
      const playerMap = new Map<string, SonosStateRow>()
      for (const row of data as SonosStateRow[]) {
        if (!playerMap.has(row.player_id)) {
          playerMap.set(row.player_id, row)
        }
      }

      const players = Array.from(playerMap.values())
      const recordedAt = players.length > 0 
        ? players[0]!.recorded_at 
        : new Date().toISOString()

      return {
        players,
        recordedAt,
      }
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

  /**
   * Write Sonos data to Supabase
   */
  protected async writeToCache(data: SonosFullState): Promise<SyncResult> {
    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    const timestamp = getCurrentTimestamp()
    let recordsWritten = 0

    try {
      const inserts: SonosStateInsert[] = data.players.map(player => ({
        player_id: player.uuid,
        player_name: player.name,
        room_name: player.roomName,
        state: player.state,
        current_track: player.state.currentTrack,
        playback_state: player.state.playbackState,
        volume: player.state.volume,
        is_muted: player.state.mute,
        recorded_at: timestamp,
      }))

      if (inserts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (client.from('sonos_state') as any).insert(inserts)
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
   * Get all Sonos players/zones
   */
  async getPlayers(): Promise<SonosPlayer[]> {
    if (this.isLocal()) {
      try {
        const players = await this.sonosService.getPlayers()
        
        // Write to cache in background
        if (this.isSupabaseAvailable()) {
          this.writeToCache({ players })
            .catch(err => this.logError('Failed to cache players', err))
        }

        return players
      } catch (error) {
        this.logError('Error fetching players', error)
        throw error
      }
    }

    // Production mode - reconstruct players from cache
    const cached = await this.fetchFromCache()
    if (!cached) return []

    return cached.players.map(row => this.rowToPlayer(row))
  }

  /**
   * Get state for a specific player
   */
  async getPlayerState(playerId: string): Promise<SonosState | null> {
    if (this.isLocal()) {
      try {
        const state = await this.sonosService.getPlayerState(playerId)
        
        // Write to cache in background
        if (this.isSupabaseAvailable()) {
          const players = await this.sonosService.getPlayers().catch(() => [])
          const player = players.find(p => p.uuid === playerId)
          if (player) {
            this.writeToCache({ players: [player] })
              .catch(err => this.logError('Failed to cache player state', err))
          }
        }

        return state
      } catch (error) {
        this.logError('Error fetching player state', error)
        throw error
      }
    }

    // Production mode - read from cache
    const client = this.getReadClient()
    if (!client) return null // Supabase not configured
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).rpc('get_latest_sonos_state', { 
        p_player_id: playerId 
      })

      if (error) throw error
      if (!data) return null

      const row = data as SonosStateRow
      return row.state
    } catch (error) {
      this.logError('Error fetching player state from cache', error)
      return null
    }
  }

  /**
   * Get current track for a player
   */
  async getCurrentTrack(playerId: string): Promise<SonosTrack | null> {
    const state = await this.getPlayerState(playerId)
    return state?.currentTrack ?? null
  }

  /**
   * Get simplified "now playing" info for all players
   */
  async getAllNowPlaying(): Promise<Array<{
    playerId: string
    playerName: string
    roomName: string
    isPlaying: boolean
    track: {
      title: string
      artist: string
      album: string
      albumArtUri: string
    } | null
    volume: number
    recordedAt?: string
  }>> {
    if (this.isLocal()) {
      const players = await this.getPlayers()
      
      return players.map(player => ({
        playerId: player.uuid,
        playerName: player.name,
        roomName: player.roomName,
        isPlaying: player.state.playbackState === 'PLAYING',
        track: player.state.currentTrack?.title ? {
          title: player.state.currentTrack.title,
          artist: player.state.currentTrack.artist,
          album: player.state.currentTrack.album,
          albumArtUri: player.state.currentTrack.absoluteAlbumArtUri ?? player.state.currentTrack.albumArtUri,
        } : null,
        volume: player.state.volume,
      }))
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached) return []

    return cached.players.map(row => ({
      playerId: row.player_id,
      playerName: row.player_name ?? '',
      roomName: row.room_name ?? '',
      isPlaying: row.playback_state === 'PLAYING',
      track: row.current_track?.title ? {
        title: row.current_track.title,
        artist: row.current_track.artist,
        album: row.current_track.album,
        albumArtUri: row.current_track.absoluteAlbumArtUri ?? row.current_track.albumArtUri,
      } : null,
      volume: row.volume ?? 0,
      recordedAt: row.recorded_at,
    }))
  }

  /**
   * Convert a cached row back to a SonosPlayer object
   */
  private rowToPlayer(row: SonosStateRow): SonosPlayer {
    const state: SonosState = row.state ?? {
      volume: row.volume ?? 0,
      mute: row.is_muted,
      equalizer: { bass: 0, treble: 0, loudness: false, surroundEnabled: false, nightMode: false },
      currentTrack: row.current_track ?? {
        artist: '',
        title: '',
        album: '',
        albumArtUri: '',
        duration: 0,
        uri: '',
        type: '',
      },
      playbackState: (row.playback_state as SonosState['playbackState']) ?? 'STOPPED',
      playMode: { repeat: 'none', shuffle: false, crossfade: false },
      uri: '',
      trackNo: 0,
      elapsedTime: 0,
      elapsedTimeFormatted: '0:00',
    }

    return {
      uuid: row.player_id,
      name: row.player_name ?? '',
      roomName: row.room_name ?? '',
      coordinator: {
        uuid: row.player_id,
        state,
      },
      state,
      groupState: {
        volume: row.volume ?? 0,
        mute: row.is_muted,
      },
    }
  }

  // ==========================================
  // Mutation methods (local mode only)
  // These delegate to the real service
  // ==========================================

  async play(playerId: string): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.sonosService.play(playerId)
  }

  async pause(playerId: string): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.sonosService.pause(playerId)
  }

  async setVolume(playerId: string, volume: number): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.sonosService.setVolume(playerId, volume)
  }

  async playSpotify(playerId: string, spotifyUri: string): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.sonosService.playSpotify(playerId, spotifyUri)
  }
}

// Export singleton instance
let sonosAdapterInstance: SonosAdapter | null = null

export function getSonosAdapter(): SonosAdapter {
  if (!sonosAdapterInstance) {
    sonosAdapterInstance = new SonosAdapter()
  }
  return sonosAdapterInstance
}
