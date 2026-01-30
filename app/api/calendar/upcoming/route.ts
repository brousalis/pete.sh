import { NextRequest, NextResponse } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getCalendarAdapter } from "@/lib/adapters"
import { isProductionMode, isLocalMode } from "@/lib/utils/mode"
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const adapter = getCalendarAdapter()
    const searchParams = request.nextUrl.searchParams
    const maxResultsParam = searchParams.get("maxResults")
    const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 10

    // In production mode (no local services), always read from cache
    if (isProductionMode()) {
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
      try {
        const cachedEvents = await adapter.getUpcomingEvents(undefined, maxResults)
        return NextResponse.json({
          success: true,
          data: {
            events: cachedEvents,
            source: 'cache',
            authenticated: false,
            authAvailable: isLocalMode(), // Auth only available in local mode
            authUrl: adapter.getAuthUrl(),
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
            authUrl: adapter.getAuthUrl(),
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
