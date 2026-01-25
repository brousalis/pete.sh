/**
 * Calendar Adapter
 * Handles Google Calendar data with event snapshots to Supabase
 * 
 * Local mode: Fetches from Google Calendar API, writes to Supabase
 * Production mode: Reads from Supabase cache
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { 
  CalendarService, 
  loadCalendarTokensFromCookies, 
  updateCalendarTokenCookies 
} from '@/lib/services/calendar.service'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { CalendarEventRow, CalendarEventInsert } from '@/lib/supabase/types'

export interface CalendarFullState {
  events: CalendarEvent[]
  calendarId: string
}

export interface CalendarCachedState {
  events: CalendarEvent[]
  recordedAt: string
}

/**
 * Calendar Adapter - manages Google Calendar events
 */
export class CalendarAdapter extends BaseAdapter<CalendarFullState, CalendarCachedState> {
  private calendarService: CalendarService
  private defaultCalendarId: string = 'primary'

  constructor(debug: boolean = false) {
    super({ serviceName: 'calendar', debug })
    this.calendarService = new CalendarService()
  }

  /**
   * Check if Calendar is configured
   */
  isConfigured(): boolean {
    return this.calendarService.isConfigured()
  }

  /**
   * Initialize the service with tokens from cookies
   * Must be called in server context before fetching data
   */
  async initializeWithTokens(): Promise<{ authenticated: boolean }> {
    if (!this.isConfigured()) {
      return { authenticated: false }
    }

    const { accessToken, refreshToken } = await loadCalendarTokensFromCookies(this.calendarService)
    return {
      authenticated: Boolean(accessToken || refreshToken),
    }
  }

  /**
   * Update cookies after API call (if token was refreshed)
   */
  async updateCookiesIfNeeded(originalAccessToken: string | null): Promise<void> {
    await updateCalendarTokenCookies(this.calendarService, originalAccessToken)
  }

  /**
   * Fetch calendar events from Google API
   */
  protected async fetchFromService(): Promise<CalendarFullState> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar not configured')
    }

    const events = await this.calendarService.getUpcomingEvents(this.defaultCalendarId, 20)
    return { events, calendarId: this.defaultCalendarId }
  }

  /**
   * Fetch cached calendar events from Supabase
   */
  protected async fetchFromCache(): Promise<CalendarCachedState | null> {
    const client = this.getReadClient()
    if (!client) return null // Supabase not configured

    try {
      // Get the most recent event snapshots
      // Use DISTINCT ON event_id to get the latest snapshot for each event
      const { data, error } = await client
        .from('calendar_events')
        .select('*')
        .gte('start_time', new Date().toISOString()) // Only future events
        .order('recorded_at', { ascending: false })
        .limit(50)

      if (error) throw error
      if (!data || data.length === 0) return null

      // Deduplicate by event_id (keep most recent snapshot)
      const eventMap = new Map<string, CalendarEventRow>()
      for (const row of data as CalendarEventRow[]) {
        if (!eventMap.has(row.event_id)) {
          eventMap.set(row.event_id, row)
        }
      }

      // Convert to CalendarEvent array and sort by start time
      const events = Array.from(eventMap.values())
        .map(row => row.event_data)
        .sort((a, b) => {
          const aTime = a.start.dateTime ?? a.start.date ?? ''
          const bTime = b.start.dateTime ?? b.start.date ?? ''
          return aTime.localeCompare(bTime)
        })

      const recordedAt = data[0]?.recorded_at ?? new Date().toISOString()

      return { events, recordedAt }
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

  /**
   * Write calendar events to Supabase
   */
  protected async writeToCache(data: CalendarFullState): Promise<SyncResult> {
    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    const timestamp = getCurrentTimestamp()
    let recordsWritten = 0

    try {
      const inserts: CalendarEventInsert[] = data.events.map(event => {
        const startDateTime = event.start.dateTime
        const endDateTime = event.end.dateTime
        const isAllDay = !startDateTime && Boolean(event.start.date)

        return {
          event_id: event.id,
          calendar_id: data.calendarId,
          summary: event.summary ?? null,
          description: event.description ?? null,
          location: event.location ?? null,
          start_time: startDateTime ?? null,
          end_time: endDateTime ?? null,
          start_date: event.start.date ?? null,
          end_date: event.end.date ?? null,
          is_all_day: isAllDay,
          status: event.status ?? null,
          html_link: event.htmlLink ?? null,
          attendees: event.attendees ?? null,
          recurrence: event.recurrence ?? null,
          event_data: event,
          recorded_at: timestamp,
        }
      })

      if (inserts.length > 0) {
        const { error } = await client.from('calendar_events').insert(inserts)
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
   * Get upcoming calendar events
   */
  async getUpcomingEvents(
    calendarId?: string,
    maxResults: number = 10
  ): Promise<CalendarEvent[]> {
    const targetCalendarId = calendarId ?? this.defaultCalendarId

    if (this.isLocal()) {
      try {
        const events = await this.calendarService.getUpcomingEvents(targetCalendarId, maxResults)
        
        // Write to cache in background
        if (this.isSupabaseAvailable()) {
          this.writeToCache({ events, calendarId: targetCalendarId })
            .catch(err => this.logError('Failed to cache events', err))
        }

        return events
      } catch (error) {
        this.logError('Error fetching events', error)
        throw error
      }
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached) {
      this.log('No cached events available')
      return []
    }

    // Limit results
    return cached.events.slice(0, maxResults)
  }

  /**
   * Get events (alias for getUpcomingEvents)
   */
  async getEvents(calendarId?: string, maxResults: number = 10): Promise<CalendarEvent[]> {
    return this.getUpcomingEvents(calendarId, maxResults)
  }

  /**
   * Get simplified event data for display
   */
  async getUpcomingEventsSimple(maxResults: number = 10): Promise<Array<{
    id: string
    title: string
    description: string | null
    location: string | null
    startTime: Date | null
    endTime: Date | null
    isAllDay: boolean
    status: string
    recordedAt?: string
  }>> {
    if (this.isLocal()) {
      const events = await this.getUpcomingEvents(undefined, maxResults)
      
      return events.map(event => ({
        id: event.id,
        title: event.summary ?? 'Untitled Event',
        description: event.description ?? null,
        location: event.location ?? null,
        startTime: event.start.dateTime ? new Date(event.start.dateTime) : null,
        endTime: event.end.dateTime ? new Date(event.end.dateTime) : null,
        isAllDay: !event.start.dateTime && Boolean(event.start.date),
        status: event.status,
      }))
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached) return []

    return cached.events.slice(0, maxResults).map(event => ({
      id: event.id,
      title: event.summary ?? 'Untitled Event',
      description: event.description ?? null,
      location: event.location ?? null,
      startTime: event.start.dateTime ? new Date(event.start.dateTime) : null,
      endTime: event.end.dateTime ? new Date(event.end.dateTime) : null,
      isAllDay: !event.start.dateTime && Boolean(event.start.date),
      status: event.status,
      recordedAt: cached.recordedAt,
    }))
  }

  /**
   * Get today's events
   */
  async getTodaysEvents(): Promise<CalendarEvent[]> {
    const events = await this.getUpcomingEvents(undefined, 50)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return events.filter(event => {
      const startStr = event.start.dateTime ?? event.start.date
      if (!startStr) return false
      
      const start = new Date(startStr)
      return start >= today && start < tomorrow
    })
  }

  /**
   * Get the next event
   */
  async getNextEvent(): Promise<CalendarEvent | null> {
    const events = await this.getUpcomingEvents(undefined, 1)
    return events[0] ?? null
  }

  // ==========================================
  // Auth pass-through methods
  // ==========================================

  getAuthUrl(forceConsent: boolean = false): string {
    return this.calendarService.getAuthUrl(forceConsent)
  }

  setCredentials(tokens: { access_token: string; refresh_token?: string }): void {
    this.calendarService.setCredentials(tokens)
  }

  getCredentials() {
    return this.calendarService.getCredentials()
  }

  async refreshAccessToken() {
    return this.calendarService.refreshAccessToken()
  }
}

// Export singleton instance
let calendarAdapterInstance: CalendarAdapter | null = null

export function getCalendarAdapter(): CalendarAdapter {
  if (!calendarAdapterInstance) {
    calendarAdapterInstance = new CalendarAdapter()
  }
  return calendarAdapterInstance
}
