/**
 * Spotify Service
 * Handles OAuth and communication with Spotify Web API
 */

import { config } from "@/lib/config"
import type {
  SpotifyAudioFeatures,
  SpotifyDevice,
  SpotifyPlaybackState,
  SpotifyPlaylist,
  SpotifyQueue,
  SpotifyRecentTrack,
  SpotifyRecommendationsParams,
  SpotifyRecommendationsResponse,
  SpotifyRepeatMode,
  SpotifySavedTrack,
  SpotifySearchResults,
  SpotifyTokens,
  SpotifyTrack,
  SpotifyUser,
} from "@/lib/types/spotify.types"
import { getSpotifyTokens } from "./token-storage"

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
const SPOTIFY_API_URL = "https://api.spotify.com/v1"

export class SpotifyService {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private redirectUri: string

  /**
   * @param redirectUri - Optional override for the OAuth redirect URI.
   *   When provided (e.g. derived from request.url), this takes priority.
   *   Falls back to http://localhost:3000/spotify/callback.
   */
  constructor(redirectUri?: string) {
    this.redirectUri = redirectUri || "http://localhost:3000/spotify/callback"
  }

  isConfigured(): boolean {
    return config.spotify.isConfigured
  }

  /**
   * Generate the OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    if (!this.isConfigured()) {
      throw new Error("Spotify not configured")
    }

    const params = new URLSearchParams({
      client_id: config.spotify.clientId!,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: config.spotify.scopes.join(" "),
      show_dialog: "false",
    })

    if (state) {
      params.set("state", state)
    }

    return `${SPOTIFY_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<SpotifyTokens> {
    if (!this.isConfigured()) {
      throw new Error("Spotify not configured")
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
    })

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${config.spotify.clientId}:${config.spotify.clientSecret}`
        ).toString("base64")}`,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error_description || "Failed to exchange code for tokens")
    }

    const tokens: SpotifyTokens = await response.json()
    this.accessToken = tokens.access_token
    this.refreshToken = tokens.refresh_token || null

    return tokens
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
    if (!this.isConfigured()) {
      throw new Error("Spotify not configured")
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${config.spotify.clientId}:${config.spotify.clientSecret}`
        ).toString("base64")}`,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error_description || "Failed to refresh token")
    }

    const tokens: SpotifyTokens = await response.json()
    this.accessToken = tokens.access_token
    // Spotify doesn't always return a new refresh token
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token
    }

    return {
      ...tokens,
      refresh_token: tokens.refresh_token || refreshToken,
    }
  }

  /**
   * Set credentials for API requests
   */
  setCredentials(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken
    if (refreshToken) {
      this.refreshToken = refreshToken
    }
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("No access token available")
    }

    const response = await fetch(`${SPOTIFY_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    // Handle 204 No Content and 202 Accepted (successful but no body)
    if (response.status === 204 || response.status === 202) {
      return {} as T
    }

    // Get response text first to safely handle empty or non-JSON responses
    const text = await response.text()

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("TOKEN_EXPIRED")
      }
      // Try to parse error as JSON
      try {
        const error = text ? JSON.parse(text) : {}
        throw new Error(error.error?.message || `API request failed: ${response.status}`)
      } catch {
        throw new Error(`API request failed: ${response.status}`)
      }
    }

    // Handle empty successful response
    if (!text) {
      return {} as T
    }

    // Parse JSON response
    try {
      return JSON.parse(text) as T
    } catch {
      // If parsing fails but response was ok, return empty object
      return {} as T
    }
  }

  // ==========================================
  // User Endpoints
  // ==========================================

  /**
   * Get current user's profile
   */
  async getCurrentUser(): Promise<SpotifyUser> {
    return this.apiRequest<SpotifyUser>("/me")
  }

  // ==========================================
  // Player Endpoints
  // ==========================================

  /**
   * Get current playback state
   */
  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    try {
      return await this.apiRequest<SpotifyPlaybackState>("/me/player")
    } catch (error) {
      // 204 means no active device
      if (error instanceof Error && error.message.includes("API request failed")) {
        return null
      }
      throw error
    }
  }

  /**
   * Get available devices
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    const response = await this.apiRequest<{ devices: SpotifyDevice[] }>("/me/player/devices")
    return response.devices || []
  }

  /**
   * Get current queue
   */
  async getQueue(): Promise<SpotifyQueue> {
    return this.apiRequest<SpotifyQueue>("/me/player/queue")
  }

  /**
   * Start/resume playback
   */
  async play(options?: {
    deviceId?: string
    contextUri?: string
    uris?: string[]
    offset?: { position: number } | { uri: string }
    positionMs?: number
  }): Promise<void> {
    const params = options?.deviceId ? `?device_id=${options.deviceId}` : ""
    const body: Record<string, unknown> = {}

    if (options?.contextUri) body.context_uri = options.contextUri
    if (options?.uris) body.uris = options.uris
    if (options?.offset) body.offset = options.offset
    if (options?.positionMs !== undefined) body.position_ms = options.positionMs

    await this.apiRequest(`/me/player/play${params}`, {
      method: "PUT",
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * Pause playback
   */
  async pause(deviceId?: string): Promise<void> {
    const params = deviceId ? `?device_id=${deviceId}` : ""
    await this.apiRequest(`/me/player/pause${params}`, { method: "PUT" })
  }

  /**
   * Skip to next track
   */
  async skipToNext(deviceId?: string): Promise<void> {
    const params = deviceId ? `?device_id=${deviceId}` : ""
    await this.apiRequest(`/me/player/next${params}`, { method: "POST" })
  }

  /**
   * Skip to previous track
   */
  async skipToPrevious(deviceId?: string): Promise<void> {
    const params = deviceId ? `?device_id=${deviceId}` : ""
    await this.apiRequest(`/me/player/previous${params}`, { method: "POST" })
  }

  /**
   * Seek to position in current track
   */
  async seek(positionMs: number, deviceId?: string): Promise<void> {
    const params = new URLSearchParams({ position_ms: positionMs.toString() })
    if (deviceId) params.set("device_id", deviceId)
    await this.apiRequest(`/me/player/seek?${params.toString()}`, { method: "PUT" })
  }

  /**
   * Set volume
   */
  async setVolume(volumePercent: number, deviceId?: string): Promise<void> {
    const params = new URLSearchParams({
      volume_percent: Math.round(volumePercent).toString(),
    })
    if (deviceId) params.set("device_id", deviceId)
    await this.apiRequest(`/me/player/volume?${params.toString()}`, { method: "PUT" })
  }

  /**
   * Set repeat mode
   */
  async setRepeat(state: SpotifyRepeatMode, deviceId?: string): Promise<void> {
    const params = new URLSearchParams({ state })
    if (deviceId) params.set("device_id", deviceId)
    await this.apiRequest(`/me/player/repeat?${params.toString()}`, { method: "PUT" })
  }

  /**
   * Toggle shuffle
   */
  async setShuffle(state: boolean, deviceId?: string): Promise<void> {
    const params = new URLSearchParams({ state: state.toString() })
    if (deviceId) params.set("device_id", deviceId)
    await this.apiRequest(`/me/player/shuffle?${params.toString()}`, { method: "PUT" })
  }

  /**
   * Add item to queue
   */
  async addToQueue(uri: string, deviceId?: string): Promise<void> {
    const params = new URLSearchParams({ uri })
    if (deviceId) params.set("device_id", deviceId)
    await this.apiRequest(`/me/player/queue?${params.toString()}`, { method: "POST" })
  }

  /**
   * Transfer playback to a device
   */
  async transferPlayback(deviceId: string, play?: boolean): Promise<void> {
    await this.apiRequest("/me/player", {
      method: "PUT",
      body: JSON.stringify({
        device_ids: [deviceId],
        play: play ?? false,
      }),
    })
  }

  // ==========================================
  // Library Endpoints
  // ==========================================

  /**
   * Get user's playlists
   */
  async getPlaylists(limit = 20, offset = 0): Promise<{ items: SpotifyPlaylist[]; total: number }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.apiRequest(`/me/playlists?${params.toString()}`)
  }

  /**
   * Get recently played tracks
   */
  async getRecentlyPlayed(limit = 20): Promise<{ items: SpotifyRecentTrack[] }> {
    const params = new URLSearchParams({ limit: limit.toString() })
    return this.apiRequest(`/me/player/recently-played?${params.toString()}`)
  }

  /**
   * Get a playlist's tracks
   */
  async getPlaylistTracks(
    playlistId: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: { track: SpotifyTrack }[]; total: number }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.apiRequest(`/playlists/${playlistId}/tracks?${params.toString()}`)
  }

  // ==========================================
  // Search Endpoint
  // ==========================================

  /**
   * Search for tracks, artists, albums, or playlists
   */
  async search(
    query: string,
    types: ("track" | "artist" | "album" | "playlist")[] = ["track"],
    limit = 20
  ): Promise<SpotifySearchResults> {
    const params = new URLSearchParams({
      q: query,
      type: types.join(","),
      limit: limit.toString(),
    })
    return this.apiRequest(`/search?${params.toString()}`)
  }

  // ==========================================
  // Audio Features Endpoints
  // ==========================================

  /**
   * Get audio features for a single track
   */
  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
    return this.apiRequest<SpotifyAudioFeatures>(`/audio-features/${trackId}`)
  }

  /**
   * Get audio features for multiple tracks (max 100)
   */
  async getAudioFeaturesForTracks(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    if (trackIds.length === 0) return []
    // API allows max 100 tracks per request
    const ids = trackIds.slice(0, 100).join(",")
    const response = await this.apiRequest<{ audio_features: (SpotifyAudioFeatures | null)[] }>(
      `/audio-features?ids=${ids}`
    )
    // Filter out null values (tracks without audio features)
    return response.audio_features.filter((f): f is SpotifyAudioFeatures => f !== null)
  }

  // ==========================================
  // User Library Endpoints
  // ==========================================

  /**
   * Get user's saved tracks (library)
   */
  async getSavedTracks(
    limit = 50,
    offset = 0
  ): Promise<{ items: SpotifySavedTrack[]; total: number; next: string | null }> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 50).toString(),
      offset: offset.toString(),
    })
    return this.apiRequest(`/me/tracks?${params.toString()}`)
  }

  /**
   * Get all saved tracks with pagination
   * Warning: This can be slow for large libraries
   */
  async getAllSavedTracks(progressCallback?: (loaded: number, total: number) => void): Promise<SpotifySavedTrack[]> {
    const allTracks: SpotifySavedTrack[] = []
    let offset = 0
    const limit = 50
    let total = 0

    do {
      const response = await this.getSavedTracks(limit, offset)
      allTracks.push(...response.items)
      total = response.total
      offset += limit
      progressCallback?.(allTracks.length, total)
    } while (offset < total)

    return allTracks
  }

  // ==========================================
  // Recommendations Endpoint
  // ==========================================

  /**
   * Get track recommendations based on seeds and audio features
   */
  async getRecommendations(params: SpotifyRecommendationsParams): Promise<SpotifyRecommendationsResponse> {
    const queryParams = new URLSearchParams()

    // Add seed parameters (max 5 total across all seed types)
    if (params.seed_artists?.length) {
      queryParams.set("seed_artists", params.seed_artists.slice(0, 5).join(","))
    }
    if (params.seed_tracks?.length) {
      queryParams.set("seed_tracks", params.seed_tracks.slice(0, 5).join(","))
    }
    if (params.seed_genres?.length) {
      queryParams.set("seed_genres", params.seed_genres.slice(0, 5).join(","))
    }

    // Limit
    if (params.limit) {
      queryParams.set("limit", Math.min(params.limit, 100).toString())
    }

    // Tempo filters
    if (params.target_tempo !== undefined) {
      queryParams.set("target_tempo", params.target_tempo.toString())
    }
    if (params.min_tempo !== undefined) {
      queryParams.set("min_tempo", params.min_tempo.toString())
    }
    if (params.max_tempo !== undefined) {
      queryParams.set("max_tempo", params.max_tempo.toString())
    }

    // Energy filters
    if (params.target_energy !== undefined) {
      queryParams.set("target_energy", params.target_energy.toString())
    }
    if (params.min_energy !== undefined) {
      queryParams.set("min_energy", params.min_energy.toString())
    }
    if (params.max_energy !== undefined) {
      queryParams.set("max_energy", params.max_energy.toString())
    }

    // Danceability filters
    if (params.target_danceability !== undefined) {
      queryParams.set("target_danceability", params.target_danceability.toString())
    }
    if (params.min_danceability !== undefined) {
      queryParams.set("min_danceability", params.min_danceability.toString())
    }
    if (params.max_danceability !== undefined) {
      queryParams.set("max_danceability", params.max_danceability.toString())
    }

    return this.apiRequest<SpotifyRecommendationsResponse>(`/recommendations?${queryParams.toString()}`)
  }

  // ==========================================
  // Playlist Management Endpoints
  // ==========================================

  /**
   * Create a new playlist
   */
  async createPlaylist(
    userId: string,
    name: string,
    options?: { description?: string; public?: boolean }
  ): Promise<SpotifyPlaylist> {
    return this.apiRequest<SpotifyPlaylist>(`/users/${userId}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description: options?.description || "",
        public: options?.public ?? false,
      }),
    })
  }

  /**
   * Add tracks to a playlist
   */
  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
    position?: number
  ): Promise<{ snapshot_id: string }> {
    const body: { uris: string[]; position?: number } = {
      uris: trackUris.slice(0, 100), // Max 100 tracks per request
    }
    if (position !== undefined) {
      body.position = position
    }
    return this.apiRequest(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  /**
   * Remove tracks from a playlist
   */
  async removeTracksFromPlaylist(
    playlistId: string,
    trackUris: string[]
  ): Promise<{ snapshot_id: string }> {
    return this.apiRequest(`/playlists/${playlistId}/tracks`, {
      method: "DELETE",
      body: JSON.stringify({
        tracks: trackUris.map((uri) => ({ uri })),
      }),
    })
  }

  /**
   * Get a single playlist by ID
   */
  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    return this.apiRequest<SpotifyPlaylist>(`/playlists/${playlistId}`)
  }

  /**
   * Get top tracks for an artist
   */
  async getArtistTopTracks(artistId: string, market = "US"): Promise<{ tracks: SpotifyTrack[] }> {
    return this.apiRequest<{ tracks: SpotifyTrack[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`
    )
  }
}

/**
 * Helper function to load Spotify tokens
 * First checks file-based storage (for cross-origin requests from pete.sh)
 * Falls back to cookies (for same-origin requests)
 */
export async function loadSpotifyTokensFromCookies(
  spotifyService: SpotifyService,
  cookieStore: { get: (name: string) => { value: string } | undefined }
): Promise<{ accessToken: string | null; refreshToken: string | null; needsRefresh: boolean }> {
  // First try file-based storage (works for cross-origin requests)
  const fileTokens = getSpotifyTokens()

  // Fall back to cookies if file storage is empty
  const cookieAccessToken = cookieStore.get("spotify_access_token")?.value || null
  const cookieRefreshToken = cookieStore.get("spotify_refresh_token")?.value || null
  const cookieExpiresAt = cookieStore.get("spotify_expires_at")?.value

  // Use file tokens if available, otherwise use cookies
  const accessToken = fileTokens.accessToken || cookieAccessToken
  const refreshToken = fileTokens.refreshToken || cookieRefreshToken
  const expiresAt = fileTokens.expiryDate || (cookieExpiresAt ? parseInt(cookieExpiresAt, 10) : null)

  // Check if token is expired or about to expire (within 5 minutes)
  const needsRefresh = expiresAt
    ? expiresAt < Date.now() + 5 * 60 * 1000
    : !accessToken && !!refreshToken

  if (accessToken) {
    spotifyService.setCredentials(accessToken, refreshToken || undefined)
  }

  return { accessToken, refreshToken, needsRefresh }
}
