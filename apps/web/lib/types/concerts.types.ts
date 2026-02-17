/**
 * TypeScript types for Concerts feature
 */

// ============================================
// Core Types
// ============================================

export interface Concert {
  id: string
  artist_name: string
  supporting_artists: string[]
  tour_name: string | null
  musicbrainz_id: string | null
  spotify_artist_id: string | null
  venue_name: string
  venue_address: string | null
  venue_lat: number | null
  venue_lng: number | null
  venue_place_id: string | null
  event_date: string // YYYY-MM-DD
  event_start: string | null // ISO timestamp
  event_end: string | null // ISO timestamp
  calendar_event_id: string | null
  setlist_fm_id: string | null
  setlist_data: SetlistData | null
  cover_image: string | null
  notes: string | null
  rating: number | null // 1-5
  tags: string[]
  companions: string[]
  ticket_cost: number | null
  status: ConcertStatus
  created_at: string
  updated_at: string
  // Joined from concert_photos
  photos?: ConcertPhoto[]
  photo_count?: number
}

export type ConcertStatus = 'upcoming' | 'attended' | 'cancelled'

export interface ConcertPhoto {
  id: string
  concert_id: string
  storage_url: string
  thumbnail_url: string | null
  original_filename: string | null
  mime_type: string | null
  file_size_bytes: number | null
  capture_time: string | null
  capture_lat: number | null
  capture_lng: number | null
  caption: string | null
  is_cover: boolean
  sort_order: number
  uploaded_via: 'web' | 'ios_shortcut' | 'api'
  created_at: string
}

// ============================================
// Setlist.fm Types
// ============================================

export interface SetlistData {
  id: string
  eventDate: string
  artist: SetlistArtist
  venue: SetlistVenue
  tour?: SetlistTour
  sets: SetlistSet[]
  url: string
  lastUpdated: string
}

export interface SetlistArtist {
  mbid: string
  name: string
  sortName: string
  url: string
}

export interface SetlistVenue {
  id: string
  name: string
  city: {
    id: string
    name: string
    state?: string
    stateCode?: string
    country: {
      code: string
      name: string
    }
  }
  url: string
}

export interface SetlistTour {
  name: string
}

export interface SetlistSet {
  name?: string
  encore?: number
  song: SetlistSong[]
}

export interface SetlistSong {
  name: string
  info?: string
  cover?: {
    mbid: string
    name: string
    sortName: string
  }
  tape?: boolean
  with?: {
    mbid: string
    name: string
    sortName: string
  }
}

// ============================================
// setlist.fm API Response Types
// ============================================

export interface SetlistFMSearchResult {
  type: string
  itemsPerPage: number
  page: number
  total: number
}

export interface SetlistFMArtistSearchResult extends SetlistFMSearchResult {
  artist: SetlistFMArtist[]
}

export interface SetlistFMSetlistSearchResult extends SetlistFMSearchResult {
  setlist: SetlistFMSetlist[]
}

export interface SetlistFMArtist {
  mbid: string
  name: string
  sortName: string
  disambiguation?: string
  url: string
}

export interface SetlistFMSetlist {
  id: string
  versionId: string
  eventDate: string // dd-MM-yyyy
  lastUpdated: string
  artist: SetlistFMArtist
  venue: {
    id: string
    name: string
    city: {
      id: string
      name: string
      state?: string
      stateCode?: string
      coords?: {
        lat: number
        long: number
      }
      country: {
        code: string
        name: string
      }
    }
    url: string
  }
  tour?: { name: string }
  sets: {
    set: Array<{
      name?: string
      encore?: number
      song: Array<{
        name: string
        info?: string
        cover?: SetlistFMArtist
        tape?: boolean
        with?: SetlistFMArtist
      }>
    }>
  }
  url: string
}

// ============================================
// Stats Types
// ============================================

export interface ConcertStats {
  total_concerts: number
  total_attended: number
  total_upcoming: number
  unique_artists: number
  unique_venues: number
  total_spent: number
  avg_rating: number
  concerts_this_year: number
  top_venue: string | null
  top_venue_count: number
  top_artist: string | null
  top_artist_count: number
  current_streak: number
  longest_streak: number
}

export interface VenueStats {
  venue_name: string
  visit_count: number
  last_visit: string
}

export interface ArtistStats {
  artist_name: string
  times_seen: number
  last_seen: string
}

// ============================================
// API Request/Response Types
// ============================================

export interface ConcertCreateRequest {
  artist_name: string
  supporting_artists?: string[]
  tour_name?: string
  venue_name: string
  venue_address?: string
  venue_lat?: number
  venue_lng?: number
  venue_place_id?: string
  event_date: string
  event_start?: string
  event_end?: string
  notes?: string
  rating?: number
  tags?: string[]
  companions?: string[]
  ticket_cost?: number
  status?: ConcertStatus
  create_calendar_event?: boolean
}

export interface ConcertUpdateRequest {
  artist_name?: string
  supporting_artists?: string[]
  tour_name?: string
  musicbrainz_id?: string
  spotify_artist_id?: string
  venue_name?: string
  venue_address?: string
  venue_lat?: number
  venue_lng?: number
  venue_place_id?: string
  event_date?: string
  event_start?: string
  event_end?: string
  setlist_fm_id?: string
  setlist_data?: SetlistData
  cover_image?: string
  notes?: string
  rating?: number | null
  tags?: string[]
  companions?: string[]
  ticket_cost?: number | null
  status?: ConcertStatus
}

export interface ConcertListResponse {
  concerts: Concert[]
  total: number
}

export interface ConcertFilters {
  status?: ConcertStatus
  year?: number
  artist?: string
  venue?: string
  tag?: string
  search?: string
  limit?: number
  offset?: number
  sort?: 'date_asc' | 'date_desc' | 'rating' | 'artist'
}

export interface CalendarSyncResult {
  found: number
  created: number
  skipped: number
  events: Array<{
    summary: string
    date: string
    matched: boolean
    reason?: string
  }>
}

export interface PhotoUploadResult {
  id: string
  storage_url: string
  thumbnail_url: string | null
  success: boolean
  error?: string
}

export interface IOSShortcutUploadPayload {
  concert_date: string // YYYY-MM-DD
  capture_time?: string // ISO timestamp
  latitude?: number
  longitude?: number
}

// ============================================
// Spotify Cross-Reference Types
// ============================================

export interface ConcertSpotifyData {
  artist_name: string
  total_plays: number
  plays_before: number
  plays_after: number
  daily_plays: Array<{
    date: string
    count: number
  }>
  top_tracks: Array<{
    track_name: string
    album_name: string
    album_image_url: string | null
    play_count: number
  }>
}
