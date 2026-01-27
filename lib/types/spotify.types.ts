/**
 * TypeScript types for Spotify integration
 */

export interface SpotifyTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

export interface SpotifyUser {
  id: string
  display_name: string
  email?: string
  images?: SpotifyImage[]
  product?: "free" | "premium" | "open"
  followers?: {
    total: number
  }
  country?: string
  uri: string
  external_urls: {
    spotify: string
  }
}

export interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

export interface SpotifyArtist {
  id: string
  name: string
  uri: string
  images?: SpotifyImage[]
  external_urls: {
    spotify: string
  }
}

export interface SpotifyAlbum {
  id: string
  name: string
  uri: string
  images: SpotifyImage[]
  release_date?: string
  total_tracks?: number
  artists: SpotifyArtist[]
  album_type?: "album" | "single" | "compilation"
  external_urls: {
    spotify: string
  }
}

export interface SpotifyTrack {
  id: string
  name: string
  uri: string
  duration_ms: number
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  is_playable?: boolean
  preview_url?: string | null
  explicit?: boolean
  popularity?: number
  external_urls: {
    spotify: string
  }
}

export interface SpotifyPlaybackState {
  is_playing: boolean
  progress_ms: number | null
  item: SpotifyTrack | null
  device: SpotifyDevice | null
  shuffle_state: boolean
  repeat_state: "off" | "track" | "context"
  context: SpotifyContext | null
  currently_playing_type: "track" | "episode" | "ad" | "unknown"
}

export interface SpotifyDevice {
  id: string | null
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number | null
  supports_volume: boolean
}

export interface SpotifyContext {
  type: "album" | "artist" | "playlist" | "show"
  uri: string
  external_urls: {
    spotify: string
  }
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  uri: string
  images: SpotifyImage[]
  owner: {
    id: string
    display_name: string
  }
  tracks: {
    total: number
    href: string
  }
  public: boolean
  collaborative: boolean
  external_urls: {
    spotify: string
  }
}

export interface SpotifyRecentTrack {
  track: SpotifyTrack
  played_at: string
  context: SpotifyContext | null
}

export interface SpotifySearchResults {
  tracks?: {
    items: SpotifyTrack[]
    total: number
    limit: number
    offset: number
  }
  artists?: {
    items: SpotifyArtist[]
    total: number
    limit: number
    offset: number
  }
  albums?: {
    items: SpotifyAlbum[]
    total: number
    limit: number
    offset: number
  }
  playlists?: {
    items: SpotifyPlaylist[]
    total: number
    limit: number
    offset: number
  }
}

export interface SpotifyQueue {
  currently_playing: SpotifyTrack | null
  queue: SpotifyTrack[]
}

export type SpotifyRepeatMode = "off" | "track" | "context"

export interface SpotifyAudioFeatures {
  id: string
  uri: string
  track_href: string
  analysis_url: string
  duration_ms: number
  tempo: number // BPM
  time_signature: number
  key: number
  mode: number // 0 = minor, 1 = major
  acousticness: number // 0.0 to 1.0
  danceability: number // 0.0 to 1.0
  energy: number // 0.0 to 1.0
  instrumentalness: number // 0.0 to 1.0
  liveness: number // 0.0 to 1.0
  loudness: number // -60 to 0 dB
  speechiness: number // 0.0 to 1.0
  valence: number // 0.0 to 1.0 (musical positivity)
}

export interface SpotifyRecommendationsParams {
  seed_artists?: string[] // Max 5 total seeds
  seed_tracks?: string[]
  seed_genres?: string[]
  limit?: number // Default 20, max 100
  // Tempo filters
  target_tempo?: number
  min_tempo?: number
  max_tempo?: number
  // Other optional filters
  target_energy?: number
  min_energy?: number
  max_energy?: number
  target_danceability?: number
  min_danceability?: number
  max_danceability?: number
}

export interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrack[]
  seeds: {
    afterFilteringSize: number
    afterRelinkingSize: number
    href: string
    id: string
    initialPoolSize: number
    type: "artist" | "track" | "genre"
  }[]
}

export interface SpotifySavedTrack {
  added_at: string
  track: SpotifyTrack
}

export interface SpotifyTrackWithFeatures extends SpotifyTrack {
  audioFeatures?: SpotifyAudioFeatures
}

export interface SpotifyAuthState {
  isAuthenticated: boolean
  user: SpotifyUser | null
  isLoading: boolean
  error: string | null
}

export interface SpotifyPlayerState {
  playbackState: SpotifyPlaybackState | null
  devices: SpotifyDevice[]
  isLoading: boolean
  error: string | null
}
