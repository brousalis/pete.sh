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
      return errorResponse("Not authenticated. Please authorize Google Calendar access.", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const maxResults = searchParams.get("maxResults") ? parseInt(searchParams.get("maxResults")!) : 10
    const calendarId = searchParams.get("calendarId") || config.google.calendarId

    try {
      const events = await calendarService.getEvents(calendarId, maxResults)

      // Update cookies if token was refreshed
      await updateCalendarTokenCookies(calendarService, accessToken)

      return successResponse(events)
    } catch (error) {
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}
