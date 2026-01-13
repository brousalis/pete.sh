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

    this.oauth2Client.setCredentials(tokens)
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
   */
  async getUpcomingEvents(calendarId: string = "primary", hours: number = 24): Promise<CalendarEvent[]> {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    try {
      const now = new Date()
      const later = new Date(now.getTime() + hours * 60 * 60 * 1000)

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: later.toISOString(),
        maxResults: 10,
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
          const now = new Date()
          const later = new Date(now.getTime() + hours * 60 * 60 * 1000)
          const response = await this.calendar.events.list({
            calendarId,
            timeMin: now.toISOString(),
            timeMax: later.toISOString(),
            maxResults: 10,
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
