/**
 * Google Calendar Service
 * Handles communication with Google Calendar API
 */

import { google } from "googleapis"
import { cookies } from "next/headers"
import { config } from "@/lib/config"
import type { CalendarEvent, CalendarEventsResponse } from "@/lib/types/calendar.types"

/**
 * Helper function to load tokens from cookies and set them on the calendar service
 * Proactively refreshes access token if missing or expired but refresh token exists
 * Returns the original access token for comparison after API calls
 */
export async function loadCalendarTokensFromCookies(
  calendarService: CalendarService
): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const cookieStore = await cookies()
  let accessToken = cookieStore.get("google_calendar_access_token")?.value || null
  const refreshToken = cookieStore.get("google_calendar_refresh_token")?.value || null

  // If we have a refresh token but no access token (or access token expired), refresh it
  if (refreshToken && !accessToken) {
    console.log("[CalendarService] Access token missing, attempting to refresh using refresh token")
    try {
      calendarService.setCredentials({
        access_token: "", // Temporary, will be refreshed
        refresh_token: refreshToken,
      })
      
      // Refresh the access token using the public method
      const updatedCredentials = await calendarService.refreshAccessToken()
      accessToken = updatedCredentials.access_token || null
      
      // Update the cookie with the new access token
      if (accessToken) {
        const expiresIn = updatedCredentials.expiry_date
          ? new Date(updatedCredentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000) // 1 hour fallback

        cookieStore.set("google_calendar_access_token", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          expires: expiresIn,
          path: "/",
        })
        
        // Update refresh token cookie if it changed
        if (updatedCredentials.refresh_token) {
          cookieStore.set("google_calendar_refresh_token", updatedCredentials.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            path: "/",
          })
        }
        
        console.log("[CalendarService] Successfully refreshed access token")
      }
    } catch (refreshError) {
      console.error("[CalendarService] Failed to refresh access token:", refreshError)
      // Clear invalid refresh token
      cookieStore.delete("google_calendar_refresh_token")
      cookieStore.delete("google_calendar_access_token")
      return { accessToken: null, refreshToken: null }
    }
  }

  if (accessToken) {
    calendarService.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    })
  }

  return { accessToken, refreshToken }
}

/**
 * Helper function to update cookies if token was refreshed
 * Also updates cookies if we have credentials but no original token (token was refreshed proactively)
 */
export async function updateCalendarTokenCookies(
  calendarService: CalendarService,
  originalAccessToken: string | null
): Promise<void> {
  const currentCredentials = calendarService.getCredentials()
  
  // Update cookie if:
  // 1. Token was refreshed (different access token)
  // 2. We have credentials but no original token (token was refreshed proactively in loadCalendarTokensFromCookies)
  if (currentCredentials.access_token) {
    const shouldUpdate = 
      !originalAccessToken || // No original token means it was refreshed proactively
      currentCredentials.access_token !== originalAccessToken // Token changed
    
    if (shouldUpdate) {
      const cookieStore = await cookies()
      const expiresIn = currentCredentials.expiry_date
        ? new Date(currentCredentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000) // 1 hour fallback

      cookieStore.set("google_calendar_access_token", currentCredentials.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresIn,
        path: "/",
      })

      // Update refresh token if it exists
      if (currentCredentials.refresh_token) {
        cookieStore.set("google_calendar_refresh_token", currentCredentials.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          path: "/",
        })
      }
    }
  }
}

export class CalendarService {
  private oauth2Client: any
  private calendar: any

  constructor() {
    if (config.google.isConfigured) {
      // Use GOOGLE_REDIRECT_URI env var, or fallback to localhost
      // IMPORTANT: Private IPs (192.168.x.x, 10.x.x.x) don't work with Google OAuth
      // You must use localhost for development
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback"

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
   * @param forceConsent - If true, forces consent screen to ensure refresh token is obtained
   */
  getAuthUrl(forceConsent: boolean = false): string {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    const scopes = ["https://www.googleapis.com/auth/calendar.readonly"]

    const authOptions: any = {
      access_type: "offline",
      scope: scopes,
    }

    // Force consent screen to ensure we get a refresh token
    // This is important for the first authorization
    if (forceConsent) {
      authOptions.prompt = "consent"
    }

    return this.oauth2Client.generateAuthUrl(authOptions)
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
   * Refresh access token using refresh token
   * Returns the new credentials if successful
   */
  async refreshAccessToken(): Promise<{ access_token: string; refresh_token?: string; expiry_date?: number }> {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar not configured")
    }

    if (!this.oauth2Client.credentials?.refresh_token) {
      throw new Error("No refresh token available")
    }

    const { credentials } = await this.oauth2Client.refreshAccessToken()
    
    // Preserve refresh token if not returned in new credentials
    const updatedCredentials = {
      ...credentials,
      refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token,
    }
    
    this.oauth2Client.setCredentials(updatedCredentials)
    
    return updatedCredentials
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
      if (error.code === 401 && this.oauth2Client.credentials?.refresh_token) {
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken()
          // Preserve refresh token if not returned in new credentials
          const updatedCredentials = {
            ...credentials,
            refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token,
          }
          this.oauth2Client.setCredentials(updatedCredentials)
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
        hasRefreshToken: !!this.oauth2Client.credentials?.refresh_token,
      })

      // Handle token refresh if needed
      if (error.code === 401 && this.oauth2Client.credentials?.refresh_token) {
        console.log("[CalendarService] Attempting token refresh")
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken()
          // Preserve refresh token if not returned in new credentials
          const updatedCredentials = {
            ...credentials,
            refresh_token: credentials.refresh_token || this.oauth2Client.credentials.refresh_token,
          }
          this.oauth2Client.setCredentials(updatedCredentials)
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
