import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { getCalendarAdapter } from "@/lib/adapters"
import { isProductionMode } from "@/lib/utils/mode"
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const adapter = getCalendarAdapter()

    // In production mode, read from cache without auth
    if (isProductionMode()) {
      const searchParams = request.nextUrl.searchParams
      const maxResultsParam = searchParams.get("maxResults")
      const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 10
      
      const events = await adapter.getUpcomingEvents(undefined, maxResults)
      return successResponse(events)
    }

    // Local mode - need authentication
    if (!adapter.isConfigured()) {
      return errorResponse("Google Calendar not configured", 400)
    }

    const { authenticated } = await adapter.initializeWithTokens()

    if (!authenticated) {
      return errorResponse("Not authenticated. Please authorize Google Calendar access.", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const maxResultsParam = searchParams.get("maxResults")
    const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 10
    const calendarId = searchParams.get("calendarId") || config.google.calendarId

    const events = await adapter.getUpcomingEvents(calendarId, maxResults)
    
    return successResponse(events)
  } catch (error) {
    console.error("[Calendar Upcoming] Error:", error instanceof Error ? error.message : error)
    return handleApiError(error)
  }
}
