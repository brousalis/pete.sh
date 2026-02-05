import { getCalendarAdapter } from "@/lib/adapters"
import { handleApiError, successResponse } from "@/lib/api/utils"
import { config } from "@/lib/config"
import { isLocalMode, isProductionMode } from "@/lib/utils/mode"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const adapter = getCalendarAdapter()
    const searchParams = request.nextUrl.searchParams
    const maxResultsParam = searchParams.get("maxResults")
    const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 10

    // In production mode (no local services), always read from cache
    // Still need to initialize tokens first because adapter.getUpcomingEvents()
    // does its own isLocal() check which may differ from global isProductionMode()
    if (isProductionMode()) {
      // Initialize tokens in case adapter decides to fetch live data
      if (adapter.isConfigured()) {
        await adapter.initializeWithTokens()
      }
      const events = await adapter.getUpcomingEvents(undefined, maxResults)
      return successResponse({
        events,
        source: 'cache',
        authenticated: false,
        authAvailable: false,
      })
    }

    // Local mode - try to authenticate
    if (!adapter.isConfigured()) {
      // Not configured, but still return cached data if available
      try {
        const cachedEvents = await adapter.getUpcomingEvents(undefined, maxResults)
        return successResponse({
          events: cachedEvents,
          source: 'cache',
          authenticated: false,
          authAvailable: false,
          message: 'Google Calendar not configured',
        })
      } catch {
        return successResponse({
          events: [],
          source: 'none',
          authenticated: false,
          authAvailable: false,
          message: 'Google Calendar not configured',
        })
      }
    }

    const { authenticated } = await adapter.initializeWithTokens()

    if (!authenticated) {
      // Not authenticated in local mode - return cached data with auth prompt
      // Use relative auth URL so the browser navigates through the page's origin (pete.sh)
      // rather than embedding a redirect URI that may point to localhost
      const authUrl = '/api/calendar/auth'
      try {
        const cachedEvents = await adapter.getUpcomingEvents(undefined, maxResults)
        return NextResponse.json({
          success: true,
          data: {
            events: cachedEvents,
            source: 'cache',
            authenticated: false,
            authAvailable: isLocalMode(), // Auth only available in local mode
            authUrl,
            message: 'Using cached data. Authenticate to get real-time updates.',
          },
        })
      } catch {
        // No cached data either
        return NextResponse.json({
          success: true,
          data: {
            events: [],
            source: 'none',
            authenticated: false,
            authAvailable: isLocalMode(),
            authUrl,
            message: 'Please authenticate to access Google Calendar.',
          },
        })
      }
    }

    // Authenticated - get live data
    const calendarId = searchParams.get("calendarId") || config.google.calendarId
    const events = await adapter.getUpcomingEvents(calendarId, maxResults)

    return successResponse({
      events,
      source: 'live',
      authenticated: true,
      authAvailable: true,
    })
  } catch (error) {
    console.error("[Calendar Upcoming] Error:", error instanceof Error ? error.message : error)
    return handleApiError(error)
  }
}
