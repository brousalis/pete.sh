/**
 * Calendar Adapter
 * Handles Google Calendar data with event snapshots to Supabase
 * 
 * Supports multiple Google accounts. Each active account's visible calendars
 * are fetched in parallel using Promise.allSettled for error isolation.
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { 
  CalendarService, 
  loadCalendarTokensFromCookies, 
  updateCalendarTokenCookies 
} from '@/lib/services/calendar.service'
import { calendarAccountsService } from '@/lib/services/calendar-accounts.service'
import {
  getLegacyGoogleCalendarTokensRaw,
  hasLegacyGoogleCalendarTokens,
} from '@/lib/services/token-storage'
import type { CalendarAccountRow } from '@/lib/types/calendar-account.types'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type { CalendarEventRow, CalendarEventInsert } from '@/lib/supabase/types'

export interface CalendarFullState {
  events: CalendarEvent[]
  calendarId: string
  accountId?: string
}

export interface CalendarCachedState {
  events: CalendarEvent[]
  recordedAt: string
}

/**
 * Calendar Adapter - manages Google Calendar events across multiple accounts
 */
export class CalendarAdapter extends BaseAdapter<CalendarFullState, CalendarCachedState> {
  private calendarService: CalendarService
  private defaultCalendarId: string = 'primary'
  private multiAccountMode: boolean = false

  constructor(debug: boolean = false) {
    super({ serviceName: 'calendar', debug })
    this.calendarService = new CalendarService()
  }

  isConfigured(): boolean {
    return this.calendarService.isConfigured()
  }

  protected async checkServiceAvailability(): Promise<boolean> {
    return this.isConfigured()
  }

  /**
   * Initialize the service with tokens.
   * Tries multi-account mode first (DB), falls back to legacy tokens (cookies/file).
   * Auto-migrates legacy .tokens.json tokens into calendar_accounts if DB is empty.
   */
  async initializeWithTokens(): Promise<{ authenticated: boolean; multiAccount: boolean }> {
    if (!this.isConfigured()) {
      return { authenticated: false, multiAccount: false }
    }

    // Try multi-account mode: check if we have any accounts in DB
    try {
      const hasAccounts = await calendarAccountsService.hasAnyAccounts()
      if (hasAccounts) {
        this.multiAccountMode = true
        return { authenticated: true, multiAccount: true }
      }

      // No accounts in DB — check for legacy tokens to migrate
      if (hasLegacyGoogleCalendarTokens()) {
        const legacy = getLegacyGoogleCalendarTokensRaw()
        if (legacy.accessToken || legacy.refreshToken) {
          try {
            console.log('[CalendarAdapter] Migrating legacy tokens to calendar_accounts')
            await calendarAccountsService.upsertAccount({
              email: 'Legacy Account',
              display_name: 'Migrated from .tokens.json',
              access_token: legacy.accessToken || 'needs-refresh',
              refresh_token: legacy.refreshToken,
              expiry_date: legacy.expiryDate,
            })
            this.multiAccountMode = true
            return { authenticated: true, multiAccount: true }
          } catch (migrationError) {
            console.warn('[CalendarAdapter] Legacy token migration failed:', migrationError)
          }
        }
      }
    } catch {
      // DB not available, fall through to legacy mode
    }

    // Legacy mode: load from cookies/file
    this.multiAccountMode = false
    const { accessToken, refreshToken } = await loadCalendarTokensFromCookies(this.calendarService)
    return {
      authenticated: Boolean(accessToken || refreshToken),
      multiAccount: false,
    }
  }

  async updateCookiesIfNeeded(originalAccessToken: string | null): Promise<void> {
    if (!this.multiAccountMode) {
      await updateCalendarTokenCookies(this.calendarService, originalAccessToken)
    }
  }

  /**
   * Fetch events from a single account across its visible calendars
   */
  private async fetchEventsForAccount(
    account: CalendarAccountRow,
    maxResults: number
  ): Promise<CalendarEvent[]> {
    const service = new CalendarService()
    service.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token ?? undefined,
    })

    const visibleCalendars = (account.selected_calendars ?? []).filter(c => c.visible)
    const calendarIds = visibleCalendars.length > 0
      ? visibleCalendars.map(c => c.calendarId)
      : ['primary']

    const allEvents: CalendarEvent[] = []

    for (const calendarId of calendarIds) {
      try {
        const events = await service.getUpcomingEvents(calendarId, maxResults)
        const calendarName = visibleCalendars.find(c => c.calendarId === calendarId)?.name

        for (const event of events) {
          event._source = {
            accountId: account.id,
            accountEmail: account.email,
            calendarId,
            calendarName,
          }
          allEvents.push(event)
        }
      } catch (error: any) {
        this.logError(`Error fetching calendar ${calendarId} for ${account.email}`, error)
      }
    }

    // Persist refreshed tokens if they changed
    const creds = service.getCredentials()
    if (creds.access_token && creds.access_token !== account.access_token) {
      try {
        await calendarAccountsService.updateTokens(account.id, {
          access_token: creds.access_token,
          refresh_token: creds.refresh_token,
          expiry_date: creds.expiry_date,
        })
      } catch (err) {
        this.logError('Failed to persist refreshed tokens', err)
      }
    }

    return allEvents
  }

  /**
   * Fetch events from all active accounts with error isolation
   */
  private async fetchMultiAccountEvents(maxResults: number): Promise<{
    events: CalendarEvent[]
    warnings: string[]
  }> {
    let accounts: CalendarAccountRow[]
    try {
      accounts = await calendarAccountsService.listActiveAccounts()
    } catch (error) {
      this.logError('Failed to load accounts', error)
      return { events: [], warnings: ['Failed to load calendar accounts'] }
    }

    if (accounts.length === 0) {
      return { events: [], warnings: [] }
    }

    const results = await Promise.allSettled(
      accounts.map(account => this.fetchEventsForAccount(account, maxResults))
    )

    const allEvents: CalendarEvent[] = []
    const warnings: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value)
      } else {
        const account = accounts[index]
        const errorMsg = result.reason?.message || 'Unknown error'
        if (account) {
          warnings.push(`Failed to fetch events for ${account.email}: ${errorMsg}`)

          // Mark account as needing re-auth if it's an auth error
          if (errorMsg.includes('re-authenticate') || errorMsg.includes('invalid_grant')) {
            calendarAccountsService.markNeedsReauth(account.id).catch(() => {})
          }
        } else {
          warnings.push(`Failed to fetch events (account index ${index}): ${errorMsg}`)
        }
      }
    })

    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aTime = a.start.dateTime ?? a.start.date ?? ''
      const bTime = b.start.dateTime ?? b.start.date ?? ''
      return aTime.localeCompare(bTime)
    })

    return { events: allEvents, warnings }
  }

  protected async fetchFromService(): Promise<CalendarFullState> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar not configured')
    }

    if (this.multiAccountMode) {
      const { events } = await this.fetchMultiAccountEvents(50)
      return { events, calendarId: 'multi' }
    }

    const events = await this.calendarService.getUpcomingEvents(this.defaultCalendarId, 20)
    return { events, calendarId: this.defaultCalendarId }
  }

  protected async fetchFromCache(): Promise<CalendarCachedState | null> {
    const client = this.getReadClient()
    if (!client) return null

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client.from('calendar_events') as any)
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('recorded_at', { ascending: false })
        .limit(50)

      if (error) throw error
      if (!data || data.length === 0) return null

      const rows = data as CalendarEventRow[]

      const eventMap = new Map<string, CalendarEventRow>()
      for (const row of rows) {
        if (!eventMap.has(row.event_id)) {
          eventMap.set(row.event_id, row)
        }
      }

      const events = Array.from(eventMap.values())
        .map(row => row.event_data)
        .sort((a, b) => {
          const aTime = a.start.dateTime ?? a.start.date ?? ''
          const bTime = b.start.dateTime ?? b.start.date ?? ''
          return aTime.localeCompare(bTime)
        })

      const recordedAt = rows[0]?.recorded_at ?? new Date().toISOString()

      return { events, recordedAt }
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

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
          account_id: event._source?.accountId ?? data.accountId ?? null,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (client.from('calendar_events') as any).insert(inserts)
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

  async getUpcomingEvents(
    calendarId?: string,
    maxResults: number = 10
  ): Promise<CalendarEvent[]> {
    const isLocal = await this.isLocal()

    if (isLocal) {
      try {
        let events: CalendarEvent[]

        if (this.multiAccountMode) {
          const result = await this.fetchMultiAccountEvents(maxResults)
          events = result.events
        } else {
          const targetCalendarId = calendarId ?? this.defaultCalendarId
          events = await this.calendarService.getUpcomingEvents(targetCalendarId, maxResults)
        }

        // Write to cache in background
        if (this.isSupabaseAvailable()) {
          this.writeToCache({ events, calendarId: calendarId ?? 'multi' })
            .catch(err => this.logError('Failed to cache events', err))
        }

        return events.slice(0, maxResults)
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

    return cached.events.slice(0, maxResults)
  }

  async getEvents(calendarId?: string, maxResults: number = 10): Promise<CalendarEvent[]> {
    return this.getUpcomingEvents(calendarId, maxResults)
  }

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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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

  async getNextEvent(): Promise<CalendarEvent | null> {
    const events = await this.getUpcomingEvents(undefined, 1)
    return events[0] ?? null
  }

  // ==========================================
  // Auth pass-through methods (legacy compat)
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
