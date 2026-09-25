/**
 * Spotify Web API client — playlist + auth only (no playback).
 */

import { config } from '@/lib/config'
import type {
  SpotifyPlaylist,
  SpotifySearchResults,
  SpotifyTokens,
  SpotifyTrack,
  SpotifyUser,
} from '@/lib/types/spotify.types'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'

export class SpotifyService {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private redirectUri: string

  constructor(redirectUri?: string) {
    this.redirectUri = redirectUri || 'http://localhost:1337/spotify/callback'
  }

  private get clientId(): string | undefined {
    return process.env.NEXT_SPOTIFY_CLIENT_ID || config.spotify.clientId
  }

  private get clientSecret(): string | undefined {
    return process.env.NEXT_SPOTIFY_CLIENT_SECRET || config.spotify.clientSecret
  }

  private get scopes(): readonly string[] {
    return config.spotify.scopes
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret)
  }

  getAuthUrl(state?: string): string {
    if (!this.isConfigured()) {
      throw new Error('Spotify not configured')
    }

    const params = new URLSearchParams({
      client_id: this.clientId!,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      show_dialog: 'false',
    })

    if (state) {
      params.set('state', state)
    }

    return `${SPOTIFY_AUTH_URL}?${params.toString()}`
  }

  async exchangeCode(code: string): Promise<SpotifyTokens> {
    if (!this.isConfigured()) {
      throw new Error('Spotify not configured')
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    })

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.clientSecret}`
        ).toString('base64')}`,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error_description?: string
      }
      throw new Error(error.error_description || 'Failed to exchange code for tokens')
    }

    const tokens: SpotifyTokens = await response.json()
    this.accessToken = tokens.access_token
    this.refreshToken = tokens.refresh_token || null
    return tokens
  }

  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
    if (!this.isConfigured()) {
      throw new Error('Spotify not configured')
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.clientSecret}`
        ).toString('base64')}`,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error_description?: string
      }
      throw new Error(error.error_description || 'Failed to refresh token')
    }

    const tokens: SpotifyTokens = await response.json()
    this.accessToken = tokens.access_token
    if (tokens.refresh_token) {
      this.refreshToken = tokens.refresh_token
    }

    return {
      ...tokens,
      refresh_token: tokens.refresh_token || refreshToken,
    }
  }

  setCredentials(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken
    if (refreshToken) {
      this.refreshToken = refreshToken
    }
  }

  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(`${SPOTIFY_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 204 || response.status === 202) {
      return {} as T
    }

    const text = await response.text()

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('TOKEN_EXPIRED')
      }
      try {
        const error = text ? JSON.parse(text) : {}
        throw new Error(error.error?.message || `API request failed: ${response.status}`)
      } catch (err) {
        if (err instanceof Error && err.message !== `API request failed: ${response.status}`) {
          throw err
        }
        throw new Error(`API request failed: ${response.status}`)
      }
    }

    if (!text) {
      return {} as T
    }

    try {
      return JSON.parse(text) as T
    } catch {
      return {} as T
    }
  }

  async getCurrentUser(): Promise<SpotifyUser> {
    return this.apiRequest<SpotifyUser>('/me')
  }

  async search(
    query: string,
    types: Array<'track' | 'artist' | 'album' | 'playlist'> = ['track'],
    limit = 20
  ): Promise<SpotifySearchResults> {
    const params = new URLSearchParams({
      q: query,
      type: types.join(','),
      limit: limit.toString(),
    })
    return this.apiRequest(`/search?${params.toString()}`)
  }

  async createPlaylist(
    userId: string,
    name: string,
    options?: { description?: string; public?: boolean }
  ): Promise<SpotifyPlaylist> {
    return this.apiRequest<SpotifyPlaylist>(`/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: options?.description || '',
        public: options?.public ?? false,
      }),
    })
  }

  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
    position?: number
  ): Promise<{ snapshot_id: string }> {
    const body: { uris: string[]; position?: number } = {
      uris: trackUris.slice(0, 100),
    }
    if (position !== undefined) {
      body.position = position
    }
    return this.apiRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}

export type { SpotifyTrack }
