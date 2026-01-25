/**
 * GetSongBPM Service
 * Handles communication with GetSongBPM API for BPM lookup
 * API Documentation: https://getsongbpm.com/api
 */

import { config } from "@/lib/config"

const API_BASE_URL = config.getSongBpm.baseUrl

export interface GetSongBpmArtist {
  id: string
  name: string
  uri: string
  genres?: string[]
  from?: string
  mbid?: string
}

export interface GetSongBpmSong {
  id: string
  title: string
  uri: string
  tempo: number
  time_sig?: string
  key_of?: string
  open_key?: string
  danceability?: number
  acousticness?: number
  artist: GetSongBpmArtist
  album?: {
    title: string
    uri: string
    year?: number
  }
}

export interface GetSongBpmTempoResult {
  song_id: string
  song_title: string
  song_uri: string
  tempo: number
  artist: GetSongBpmArtist
  album?: {
    title: string
    uri: string
    year?: number
  }
}

export interface GetSongBpmSearchResult {
  search: GetSongBpmSong[]
}

export interface GetSongBpmTempoResponse {
  tempo: GetSongBpmTempoResult[]
}

export interface GetSongBpmSongResponse {
  song: GetSongBpmSong
}

export class GetSongBpmService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = config.getSongBpm.apiKey
  }

  isConfigured(): boolean {
    return config.getSongBpm.isConfigured
  }

  /**
   * Make API request to GetSongBPM
   */
  private async apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error("GetSongBPM API key not configured")
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`)
    url.searchParams.set("api_key", this.apiKey)
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GetSongBPM API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Search for songs by title and optionally artist
   * Returns BPM data for matching songs
   */
  async searchSong(
    songTitle: string,
    artistName?: string,
    limit = 10
  ): Promise<GetSongBpmSong[]> {
    let lookup: string
    
    if (artistName) {
      // Use "both" type for combined search
      lookup = `song:${songTitle} artist:${artistName}`
      const response = await this.apiRequest<GetSongBpmSearchResult>("/search/", {
        type: "both",
        lookup: lookup,
        limit: limit.toString(),
      })
      return response.search || []
    } else {
      // Just search by song title
      const response = await this.apiRequest<GetSongBpmSearchResult>("/search/", {
        type: "song",
        lookup: songTitle,
        limit: limit.toString(),
      })
      return response.search || []
    }
  }

  /**
   * Search for artists
   */
  async searchArtist(artistName: string, limit = 10): Promise<GetSongBpmArtist[]> {
    const response = await this.apiRequest<{ search: GetSongBpmArtist[] }>("/search/", {
      type: "artist",
      lookup: artistName,
      limit: limit.toString(),
    })
    return response.search || []
  }

  /**
   * Get song details by GetSongBPM ID
   */
  async getSong(songId: string): Promise<GetSongBpmSong> {
    const response = await this.apiRequest<GetSongBpmSongResponse>("/song/", {
      id: songId,
    })
    return response.song
  }

  /**
   * Find songs within a BPM range
   * @param bpm Target BPM or BPM range (e.g., "170" or "165-175")
   * @param limit Number of results (default: 250, max popular songs in last 30 days)
   */
  async findByTempo(bpm: string | number, limit = 50): Promise<GetSongBpmTempoResult[]> {
    const response = await this.apiRequest<GetSongBpmTempoResponse>("/tempo/", {
      bpm: bpm.toString(),
      limit: limit.toString(),
    })
    return response.tempo || []
  }

  /**
   * Find songs within a BPM range (convenience method)
   */
  async findByTempoRange(minBpm: number, maxBpm: number, limit = 50): Promise<GetSongBpmTempoResult[]> {
    return this.findByTempo(`${minBpm}-${maxBpm}`, limit)
  }
}

// Export singleton instance
export const getSongBpmService = new GetSongBpmService()
