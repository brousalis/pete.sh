import { NextRequest } from "next/server"
import { cookies } from "next/headers"
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

    // Debug: Check what cookies we have
    const cookieStore = await cookies()
    const hasAccessToken = !!cookieStore.get("google_calendar_access_token")?.value
    const hasRefreshToken = !!cookieStore.get("google_calendar_refresh_token")?.value
    
    console.log("[Calendar Upcoming] Cookie status:", {
      hasAccessToken,
      hasRefreshToken,
    })

    // Load tokens from cookies and set them on the service
    // This will also attempt to refresh if access token is missing but refresh token exists
    const { accessToken, refreshToken } = await loadCalendarTokensFromCookies(calendarService)

    console.log("[Calendar Upcoming] After token load:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    })

    if (!accessToken && !refreshToken) {
      // No tokens at all - need to authenticate
      return errorResponse("Not authenticated. Please authorize Google Calendar access.", 401)
    }

    if (!accessToken) {
      // We have refresh token but couldn't get access token - something went wrong
      console.error("[Calendar Upcoming] Has refresh token but no access token after load")
      return errorResponse("Authentication expired. Please re-authorize Google Calendar access.", 401)
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
