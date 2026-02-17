/**
 * Concerts Service
 * Handles CRUD operations for concerts, calendar sync, and stats
 */

import { config } from '@/lib/config'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type {
    CalendarSyncResult,
    Concert,
    ConcertCreateRequest,
    ConcertFilters,
    ConcertListResponse,
    ConcertPhoto,
    ConcertSpotifyData,
    ConcertStats,
    ConcertUpdateRequest,
} from '@/lib/types/concerts.types'

/** Known Chicago concert venues for calendar event matching */
const KNOWN_VENUES = [
  'Metro',
  'Thalia Hall',
  'United Center',
  'Riviera Theatre',
  'Riviera',
  'Salt Shed',
  'The Salt Shed',
  'Radius',
  'Aragon Ballroom',
  'Aragon',
  'House of Blues',
  'Concord Music Hall',
  'Concord',
  'Lincoln Hall',
  'Schubas',
  'Empty Bottle',
  'Bottom Lounge',
  'Park West',
  'Vic Theatre',
  'Chicago Theatre',
  'Auditorium Theatre',
  'Huntington Bank Pavilion',
  'Northerly Island',
  'Wintrust Arena',
  'Soldier Field',
  'Byline Bank Aragon Ballroom',
  'Subterranean',
  'Beat Kitchen',
  'Sleeping Village',
  'Martyrs',
  'Chop Shop',
  'Reggies',
]

/** Keywords that indicate a calendar event might be a concert */
const CONCERT_KEYWORDS = [
  'concert',
  'show',
  'tour',
  'live',
  'festival',
  'tickets',
  'gig',
  'setlist',
  'opener',
  'headliner',
  'doors',
  'sold out',
]

export class ConcertsService {
  /**
   * Get all concerts with optional filtering
   */
  async getConcerts(filters: ConcertFilters = {}): Promise<ConcertListResponse> {
    const client = getSupabaseClientForOperation('read')
    if (!client) throw new Error('Supabase not configured')

    let query = client
      .from('concerts')
      .select('*, concert_photos(id, storage_url, thumbnail_url, is_cover, sort_order, capture_time)', { count: 'exact' })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.year) {
      query = query
        .gte('event_date', `${filters.year}-01-01`)
        .lte('event_date', `${filters.year}-12-31`)
    }
    if (filters.artist) {
      query = query.ilike('artist_name', `%${filters.artist}%`)
    }
    if (filters.venue) {
      query = query.ilike('venue_name', `%${filters.venue}%`)
    }
    if (filters.tag) {
      query = query.contains('tags', [filters.tag])
    }
    if (filters.search) {
      query = query.or(
        `artist_name.ilike.%${filters.search}%,venue_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
      )
    }

    // Sorting
    switch (filters.sort) {
      case 'date_asc':
        query = query.order('event_date', { ascending: true })
        break
      case 'rating':
        query = query.order('rating', { ascending: false, nullsFirst: false })
        break
      case 'artist':
        query = query.order('artist_name', { ascending: true })
        break
      default:
        query = query.order('event_date', { ascending: false })
    }

    // Pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw new Error(`Failed to fetch concerts: ${error.message}`)

    const concerts = (data || []).map((row) => this.mapRowToConcert(row))

    return {
      concerts,
      total: count || 0,
    }
  }

  /**
   * Get a single concert by ID with photos
   */
  async getConcert(id: string): Promise<Concert | null> {
    const client = getSupabaseClientForOperation('read')
    if (!client) throw new Error('Supabase not configured')

    const { data, error } = await client
      .from('concerts')
      .select('*, concert_photos(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch concert: ${error.message}`)
    }

    return this.mapRowToConcert(data)
  }

  /**
   * Create a new concert
   */
  async createConcert(input: ConcertCreateRequest): Promise<Concert> {
    const client = getSupabaseClientForOperation('write')
    if (!client) throw new Error('Supabase not configured')

    const { data, error } = await client
      .from('concerts')
      .insert({
        artist_name: input.artist_name,
        supporting_artists: input.supporting_artists || [],
        tour_name: input.tour_name || null,
        venue_name: input.venue_name,
        venue_address: input.venue_address || null,
        venue_lat: input.venue_lat || null,
        venue_lng: input.venue_lng || null,
        venue_place_id: input.venue_place_id || null,
        event_date: input.event_date,
        event_start: input.event_start || null,
        event_end: input.event_end || null,
        notes: input.notes || null,
        rating: input.rating || null,
        tags: input.tags || [],
        companions: input.companions || [],
        ticket_cost: input.ticket_cost || null,
        status: input.status || 'upcoming',
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create concert: ${error.message}`)
    return this.mapRowToConcert(data)
  }

  /**
   * Update a concert
   */
  async updateConcert(id: string, input: ConcertUpdateRequest): Promise<Concert> {
    const client = getSupabaseClientForOperation('write')
    if (!client) throw new Error('Supabase not configured')

    // Build update object, only including provided fields
    const update: Record<string, unknown> = {}
    const fields: (keyof ConcertUpdateRequest)[] = [
      'artist_name', 'supporting_artists', 'tour_name', 'musicbrainz_id',
      'spotify_artist_id', 'venue_name', 'venue_address', 'venue_lat',
      'venue_lng', 'venue_place_id', 'event_date', 'event_start', 'event_end',
      'setlist_fm_id', 'setlist_data', 'cover_image', 'notes', 'rating',
      'tags', 'companions', 'ticket_cost', 'status',
    ]

    for (const field of fields) {
      if (field in input) {
        update[field] = input[field]
      }
    }

    const { data, error } = await client
      .from('concerts')
      .update(update as Partial<import('@/lib/supabase/types').ConcertInsert>)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update concert: ${error.message}`)
    return this.mapRowToConcert(data)
  }

  /**
   * Delete a concert
   */
  async deleteConcert(id: string): Promise<void> {
    const client = getSupabaseClientForOperation('write')
    if (!client) throw new Error('Supabase not configured')

    const { error } = await client
      .from('concerts')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Failed to delete concert: ${error.message}`)
  }

  /**
   * Get concert statistics
   */
  async getStats(year?: number): Promise<ConcertStats> {
    const client = getSupabaseClientForOperation('read')
    if (!client) throw new Error('Supabase not configured')

    // Get main stats
    const { data: statsData, error: statsError } = await client
      .rpc('get_concert_stats', { p_year: year || null })

    if (statsError) throw new Error(`Failed to fetch concert stats: ${statsError.message}`)

    const stats = Array.isArray(statsData) ? statsData[0] : statsData

    // Get streak
    const { data: streakData, error: streakError } = await client
      .rpc('get_concert_streak')

    if (streakError) {
      console.error('Failed to fetch concert streak:', streakError.message)
    }

    const streak = streakData ? (Array.isArray(streakData) ? streakData[0] : streakData) : null

    return {
      total_concerts: Number(stats?.total_concerts || 0),
      total_attended: Number(stats?.total_attended || 0),
      total_upcoming: Number(stats?.total_upcoming || 0),
      unique_artists: Number(stats?.unique_artists || 0),
      unique_venues: Number(stats?.unique_venues || 0),
      total_spent: Number(stats?.total_spent || 0),
      avg_rating: Number(stats?.avg_rating || 0),
      concerts_this_year: Number(stats?.concerts_this_year || 0),
      top_venue: stats?.top_venue || null,
      top_venue_count: Number(stats?.top_venue_count || 0),
      top_artist: stats?.top_artist || null,
      top_artist_count: Number(stats?.top_artist_count || 0),
      current_streak: Number(streak?.current_streak || 0),
      longest_streak: Number(streak?.longest_streak || 0),
    }
  }

  /**
   * Get photos for a concert
   */
  async getPhotos(concertId: string): Promise<ConcertPhoto[]> {
    const client = getSupabaseClientForOperation('read')
    if (!client) throw new Error('Supabase not configured')

    const { data, error } = await client
      .from('concert_photos')
      .select('*')
      .eq('concert_id', concertId)
      .order('sort_order', { ascending: true })
      .order('capture_time', { ascending: true, nullsFirst: false })

    if (error) throw new Error(`Failed to fetch photos: ${error.message}`)
    return (data || []) as ConcertPhoto[]
  }

  /**
   * Add a photo record to a concert
   */
  async addPhoto(
    concertId: string,
    photo: {
      storage_url: string
      thumbnail_url?: string
      original_filename?: string
      mime_type?: string
      file_size_bytes?: number
      capture_time?: string
      capture_lat?: number
      capture_lng?: number
      caption?: string
      uploaded_via?: 'web' | 'ios_shortcut' | 'api'
    }
  ): Promise<ConcertPhoto> {
    const client = getSupabaseClientForOperation('write')
    if (!client) throw new Error('Supabase not configured')

    // Get the next sort_order
    const { data: maxOrder } = await client
      .from('concert_photos')
      .select('sort_order')
      .eq('concert_id', concertId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.sort_order ?? -1) + 1

    const { data, error } = await client
      .from('concert_photos')
      .insert({
        concert_id: concertId,
        storage_url: photo.storage_url,
        thumbnail_url: photo.thumbnail_url || null,
        original_filename: photo.original_filename || null,
        mime_type: photo.mime_type || null,
        file_size_bytes: photo.file_size_bytes || null,
        capture_time: photo.capture_time || null,
        capture_lat: photo.capture_lat || null,
        capture_lng: photo.capture_lng || null,
        caption: photo.caption || null,
        uploaded_via: photo.uploaded_via || 'web',
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to add photo: ${error.message}`)
    return data as ConcertPhoto
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    const client = getSupabaseClientForOperation('write')
    if (!client) throw new Error('Supabase not configured')

    const { error } = await client
      .from('concert_photos')
      .delete()
      .eq('id', photoId)

    if (error) throw new Error(`Failed to delete photo: ${error.message}`)
  }

  /**
   * Set a photo as cover image for a concert
   */
  async setCoverPhoto(concertId: string, photoId: string): Promise<void> {
    const client = getSupabaseClientForOperation('write')
    if (!client) throw new Error('Supabase not configured')

    // Unset existing cover
    await client
      .from('concert_photos')
      .update({ is_cover: false })
      .eq('concert_id', concertId)
      .eq('is_cover', true)

    // Set new cover
    const { data: photo, error: photoError } = await client
      .from('concert_photos')
      .update({ is_cover: true })
      .eq('id', photoId)
      .select('storage_url')
      .single()

    if (photoError) throw new Error(`Failed to set cover photo: ${photoError.message}`)

    // Update concert cover_image
    await client
      .from('concerts')
      .update({ cover_image: photo.storage_url })
      .eq('id', concertId)
  }

  /**
   * Sync concerts from Google Calendar events
   */
  async syncFromCalendar(events: CalendarEvent[]): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      found: 0,
      created: 0,
      skipped: 0,
      events: [],
    }

    for (const event of events) {
      const isConcert = this.detectConcertEvent(event)

      if (!isConcert) continue

      result.found++

      // Check if already synced
      const client = getSupabaseClientForOperation('read')
      if (!client) throw new Error('Supabase not configured')
      const { data: existing } = await client
        .from('concerts')
        .select('id')
        .eq('calendar_event_id', event.id)
        .single()

      if (existing) {
        result.skipped++
        result.events.push({
          summary: event.summary,
          date: event.start.dateTime || event.start.date || '',
          matched: true,
          reason: 'Already synced',
        })
        continue
      }

      // Parse event data to create concert
      const parsed = this.parseCalendarEvent(event)

      try {
        await this.createConcert({
          ...parsed,
          status: this.isEventInPast(event) ? 'attended' : 'upcoming',
        })

        // Set calendar_event_id (not in ConcertCreateRequest)
        const writeClient = getSupabaseClientForOperation('write')
        if (!writeClient) throw new Error('Supabase not configured')
        const { data: created } = await writeClient
          .from('concerts')
          .select('id')
          .eq('artist_name', parsed.artist_name)
          .eq('event_date', parsed.event_date)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (created) {
          await writeClient
            .from('concerts')
            .update({ calendar_event_id: event.id })
            .eq('id', created.id)
        }

        result.created++
        result.events.push({
          summary: event.summary,
          date: event.start.dateTime || event.start.date || '',
          matched: true,
        })
      } catch (err) {
        result.events.push({
          summary: event.summary,
          date: event.start.dateTime || event.start.date || '',
          matched: false,
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return result
  }

  /**
   * Find a concert matching a date (for iOS Shortcut photo uploads)
   */
  async findConcertByDate(date: string): Promise<Concert | null> {
    const client = getSupabaseClientForOperation('read')
    if (!client) throw new Error('Supabase not configured')

    const { data, error } = await client
      .from('concerts')
      .select('*')
      .eq('event_date', date)
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find concert: ${error.message}`)
    }

    return this.mapRowToConcert(data)
  }

  /**
   * Get Spotify listening data for a concert's artist
   */
  async getSpotifyData(
    artistName: string,
    spotifyArtistId: string | null,
    eventDate: string
  ): Promise<ConcertSpotifyData> {
    const client = getSupabaseClientForOperation('read')
    if (!client) throw new Error('Supabase not configured')

    const eventDateObj = new Date(eventDate)
    const thirtyDaysBefore = new Date(eventDateObj)
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30)
    const thirtyDaysAfter = new Date(eventDateObj)
    thirtyDaysAfter.setDate(thirtyDaysAfter.getDate() + 30)

    // Query by artist name (case-insensitive partial match)
    const searchTerm = `%${artistName}%`

    const { data, error } = await client
      .from('spotify_listening_history')
      .select('track_name, album_name, album_image_url, played_at, track_artists')
      .ilike('track_artists', searchTerm)
      .gte('played_at', thirtyDaysBefore.toISOString())
      .lte('played_at', thirtyDaysAfter.toISOString())
      .order('played_at', { ascending: true })

    if (error || !data) {
      return {
        artist_name: artistName,
        total_plays: 0,
        plays_before: 0,
        plays_after: 0,
        daily_plays: [],
        top_tracks: [],
      }
    }

    // Calculate stats
    const playsBefore = data.filter(
      (d) => new Date(d.played_at) < eventDateObj
    ).length
    const playsAfter = data.filter(
      (d) => new Date(d.played_at) > eventDateObj
    ).length

    // Group by day for sparkline
    const dailyMap = new Map<string, number>()
    for (const track of data) {
      const day = track.played_at.split('T')[0]
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
    }
    const daily_plays = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top tracks
    const trackCounts = new Map<
      string,
      { track_name: string; album_name: string; album_image_url: string | null; count: number }
    >()
    for (const track of data) {
      const key = track.track_name
      const existing = trackCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        trackCounts.set(key, {
          track_name: track.track_name,
          album_name: track.album_name,
          album_image_url: track.album_image_url,
          count: 1,
        })
      }
    }
    const top_tracks = Array.from(trackCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((t) => ({
        track_name: t.track_name,
        album_name: t.album_name,
        album_image_url: t.album_image_url,
        play_count: t.count,
      }))

    return {
      artist_name: artistName,
      total_plays: data.length,
      plays_before: playsBefore,
      plays_after: playsAfter,
      daily_plays,
      top_tracks,
    }
  }

  /**
   * Get distinct years that have concerts
   */
  async getYears(): Promise<number[]> {
    const client = getSupabaseClientForOperation('read')
    if (!client) return []

    const { data, error } = await client
      .from('concerts')
      .select('event_date')
      .order('event_date', { ascending: false })

    if (error || !data) return []

    const years = [...new Set(data.map((d) => new Date(d.event_date).getFullYear()))]
    return years.sort((a, b) => b - a)
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Detect if a calendar event is likely a concert
   */
  private detectConcertEvent(event: CalendarEvent): boolean {
    const summary = (event.summary || '').toLowerCase()
    const location = (event.location || '').toLowerCase()
    const description = (event.description || '').toLowerCase()

    // Check for dedicated calendar
    if (config.concerts.calendarId) {
      return true // If using a dedicated calendar, all events are concerts
    }

    // Check against known venues
    for (const venue of KNOWN_VENUES) {
      if (location.includes(venue.toLowerCase()) || summary.includes(venue.toLowerCase())) {
        return true
      }
    }

    // Check for keywords
    for (const keyword of CONCERT_KEYWORDS) {
      if (
        summary.includes(keyword) ||
        description.includes(keyword) ||
        location.includes(keyword)
      ) {
        return true
      }
    }

    return false
  }

  /**
   * Parse a calendar event into concert creation data
   */
  private parseCalendarEvent(event: CalendarEvent): ConcertCreateRequest {
    const summary = event.summary || 'Unknown Artist'

    // Try to extract artist name from summary
    // Common patterns: "Artist Name at Venue", "Artist Name - Venue", "Artist Name"
    let artistName = summary
    const atIndex = summary.toLowerCase().indexOf(' at ')
    const dashIndex = summary.indexOf(' - ')
    const pipeIndex = summary.indexOf(' | ')

    if (atIndex > 0) {
      artistName = summary.substring(0, atIndex).trim()
    } else if (dashIndex > 0) {
      artistName = summary.substring(0, dashIndex).trim()
    } else if (pipeIndex > 0) {
      artistName = summary.substring(0, pipeIndex).trim()
    }

    // Extract venue from location or summary
    let venueName = event.location || 'Unknown Venue'
    // If location contains a comma (address), take just the first part
    if (venueName.includes(',')) {
      venueName = venueName.split(',')[0]?.trim() || venueName
    }

    const eventDate = event.start.dateTime
      ? (event.start.dateTime.split('T')[0] ?? new Date().toISOString().split('T')[0]!)
      : event.start.date || new Date().toISOString().split('T')[0]!

    return {
      artist_name: artistName,
      venue_name: venueName,
      venue_address: event.location || undefined,
      event_date: eventDate,
      event_start: event.start.dateTime || undefined,
      event_end: event.end.dateTime || undefined,
    }
  }

  private isEventInPast(event: CalendarEvent): boolean {
    const dateStr = event.start.dateTime || event.start.date
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToConcert(row: any): Concert {
    const photos = row.concert_photos
      ? Array.isArray(row.concert_photos)
        ? row.concert_photos
        : []
      : undefined

    return {
      id: row.id,
      artist_name: row.artist_name,
      supporting_artists: row.supporting_artists || [],
      tour_name: row.tour_name,
      musicbrainz_id: row.musicbrainz_id,
      spotify_artist_id: row.spotify_artist_id,
      venue_name: row.venue_name,
      venue_address: row.venue_address,
      venue_lat: row.venue_lat,
      venue_lng: row.venue_lng,
      venue_place_id: row.venue_place_id,
      event_date: row.event_date,
      event_start: row.event_start,
      event_end: row.event_end,
      calendar_event_id: row.calendar_event_id,
      setlist_fm_id: row.setlist_fm_id,
      setlist_data: row.setlist_data,
      cover_image: row.cover_image,
      notes: row.notes,
      rating: row.rating,
      tags: row.tags || [],
      companions: row.companions || [],
      ticket_cost: row.ticket_cost ? Number(row.ticket_cost) : null,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      photos,
      photo_count: photos?.length,
    }
  }
}
