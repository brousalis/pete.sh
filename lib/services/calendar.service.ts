/**
 * Google Calendar Service
 * Handles communication with Google Calendar API
 */

import { google } from "googleapis"
import { config } from "@/lib/config"
import type { CalendarEvent, CalendarEventsResponse } from "@/lib/types/calendar.types"

export class CalendarService {
  private oauth2Client: any
  private calendar: any

  constructor() {
    if (config.google.isConfigured) {
      // Use environment variable for redirect URI, fallback to localhost for development
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        (process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
          : "http://localhost:3000/api/calendar/callback")

      this.oauth2Client = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        redirectUri
      )
      this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client })
    }
  }

  isConfigured(): boolean {
    return config.google.isConfigured
  }

  /**
   * Get authorization URL
   */
  getAuthUrl(): string {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    const scopes = ["https://www.googleapis.com/auth/calendar.readonly"]

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    })
  }

  /**
   * Set access token (after OAuth callback)
   */
  setAccessToken(token: string, refreshToken?: string): void {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    this.oauth2Client.setCredentials({
      access_token: token,
      refresh_token: refreshToken,
    })
  }

  /**
   * Set credentials from tokens object
   */
  setCredentials(tokens: { access_token: string; refresh_token?: string }): void {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    console.log("[CalendarService] Setting credentials:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    })

    this.oauth2Client.setCredentials(tokens)
    
    // Ensure calendar client uses the updated credentials
    // The calendar client should automatically use the oauth2Client, but let's verify
    if (this.calendar) {
      this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client })
    }
  }

  /**
   * Get current credentials (useful for checking if token was refreshed)
   */
  getCredentials(): { access_token?: string; refresh_token?: string; expiry_date?: number } {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    return this.oauth2Client.credentials || {}
  }

  /**
   * Get calendar events
   */
  async getEvents(calendarId: string = "primary", maxResults: number = 10): Promise<CalendarEvent[]> {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      })

      return response.data.items || []
    } catch (error: any) {
      // Handle token refresh if needed
      if (error.code === 401 && this.oauth2Client.credentials.refresh_token) {
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken()
          this.oauth2Client.setCredentials(credentials)
          // Retry the request
          const response = await this.calendar.events.list({
            calendarId,
            timeMin: new Date().toISOString(),
            maxResults,
            singleEvents: true,
            orderBy: "startTime",
          })
          return response.data.items || []
        } catch (refreshError) {
          throw new Error(`Google Calendar API error: Token refresh failed. Please re-authenticate.`)
        }
      }
      throw new Error(`Google Calendar API error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Get upcoming events
   * Returns the next N upcoming events regardless of how far in the future
   */
  async getUpcomingEvents(calendarId: string = "primary", maxResults: number = 10): Promise<CalendarEvent[]> {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    if (!this.calendar) {
      throw new Error("Calendar client not initialized")
    }

    if (!this.oauth2Client.credentials?.access_token) {
      throw new Error("No access token available. Please authenticate.")
    }

    try {
      const now = new Date()

      console.log("[CalendarService] Fetching upcoming events:", {
        calendarId,
        timeMin: now.toISOString(),
        maxResults,
        note: "No timeMax - showing all future events",
      })

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        // No timeMax - get all future events
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
        showDeleted: false, // Don't show deleted events
      })

      console.log("[CalendarService] API response:", {
        itemsCount: response.data.items?.length || 0,
        hasItems: !!response.data.items,
        responseKeys: Object.keys(response.data || {}),
        calendarSummary: response.data.summary,
        calendarTimeZone: response.data.timeZone,
        fullResponse: JSON.stringify(response.data, null, 2),
      })

      const events = response.data.items || []
      
      // Filter out cancelled events
      const activeEvents = events.filter((e: CalendarEvent) => e.status !== "cancelled")
      
      console.log("[CalendarService] Event filtering:", {
        totalEvents: events.length,
        cancelledEvents: events.filter((e: CalendarEvent) => e.status === "cancelled").length,
        activeEvents: activeEvents.length,
        summaries: activeEvents.map((e: CalendarEvent) => ({
          summary: e.summary,
          start: e.start.dateTime || e.start.date,
          status: e.status,
        })),
      })

      return activeEvents
    } catch (error: any) {
      console.error("[CalendarService] Error in getUpcomingEvents:", {
        error: error.message,
        code: error.code,
        response: error.response?.data,
        hasRefreshToken: !!this.oauth2Client.credentials.refresh_token,
      })

      // Handle token refresh if needed
      if (error.code === 401 && this.oauth2Client.credentials.refresh_token) {
        console.log("[CalendarService] Attempting token refresh")
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken()
          this.oauth2Client.setCredentials(credentials)
          console.log("[CalendarService] Token refreshed successfully, retrying request")
          // Retry the request
          const now = new Date()
          const response = await this.calendar.events.list({
            calendarId,
            timeMin: now.toISOString(),
            // No timeMax - get all future events
            maxResults,
            singleEvents: true,
            orderBy: "startTime",
          })
          const events = response.data.items || []
          return events.filter((e: CalendarEvent) => e.status !== "cancelled")
        } catch (refreshError: any) {
          console.error("[CalendarService] Token refresh failed:", refreshError)
          throw new Error(`Google Calendar API error: Token refresh failed. Please re-authenticate.`)
        }
      }
      throw new Error(`Google Calendar API error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: Partial<CalendarEvent>, calendarId: string = "primary"): Promise<CalendarEvent> {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    try {
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
      })

      return response.data
    } catch (error) {
      throw new Error(`Google Calendar API error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}
