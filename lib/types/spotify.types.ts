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
