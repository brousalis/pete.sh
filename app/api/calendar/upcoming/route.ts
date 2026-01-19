import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import {
  CalendarService,
  loadCalendarTokensFromCookies,
  updateCalendarTokenCookies,
} from "@/lib/services/calendar.service"
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      return errorResponse("Google Calendar not configured", 400)
    }

    // Load tokens from cookies and set them on the service
    const { accessToken } = await loadCalendarTokensFromCookies(calendarService)

    if (!accessToken) {
      // Not authenticated is an expected state - return 401 silently
      return errorResponse("Not authenticated. Please authorize Google Calendar access.", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const maxResultsParam = searchParams.get("maxResults")
    const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 10
    const calendarId = searchParams.get("calendarId") || config.google.calendarId

    const events = await calendarService.getUpcomingEvents(calendarId, maxResults)

    // Update cookies if token was refreshed
    await updateCalendarTokenCookies(calendarService, accessToken)

    return successResponse(events)
  } catch (error) {
    console.error("[Calendar Upcoming] Error:", error instanceof Error ? error.message : error)
    return handleApiError(error)
  }
}
