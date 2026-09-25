/**
 * Minimal Spotify types for playlist creation.
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
  uri: string
  external_urls: {
    spotify: string
  }
}

export interface SpotifyArtist {
  id: string
  name: string
  uri: string
  external_urls: {
    spotify: string
  }
}

export interface SpotifyAlbum {
  id: string
  name: string
  uri: string
  images: Array<{ url: string; width: number | null; height: number | null }>
  artists: SpotifyArtist[]
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
  external_urls: {
    spotify: string
  }
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  uri: string
  public: boolean
  external_urls: {
    spotify: string
  }
}

export interface SpotifySearchResults {
  tracks?: {
    items: SpotifyTrack[]
    total: number
    limit: number
    offset: number
  }
}
