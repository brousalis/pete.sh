import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { CalendarService } from "@/lib/services/calendar.service"
import { google } from "googleapis"
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    console.log("[Calendar Upcoming] Request received")
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      console.log("[Calendar Upcoming] Google Calendar not configured")
      return errorResponse("Google Calendar not configured", 400)
    }

    // Get tokens from cookies
    const cookieStore = await cookies()
    let accessToken = cookieStore.get("google_calendar_access_token")?.value
    const refreshToken = cookieStore.get("google_calendar_refresh_token")?.value

    console.log("[Calendar Upcoming] Token check:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
    })

    if (!accessToken) {
      console.log("[Calendar Upcoming] No access token found")
      return errorResponse("Not authenticated. Please authorize Google Calendar access.", 401)
    }

    // Set credentials on the service
    calendarService.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const searchParams = request.nextUrl.searchParams
    const maxResultsParam = searchParams.get("maxResults")
    const maxResults = maxResultsParam ? parseInt(maxResultsParam) : 10
    const calendarId = searchParams.get("calendarId") || config.google.calendarId

    console.log("[Calendar Upcoming] Fetching events:", {
      maxResultsParam,
      maxResults,
      calendarId,
      requestedUrl: request.url,
      allSearchParams: Object.fromEntries(searchParams.entries()),
      note: "No time window - showing all upcoming events",
    })

    try {
      const events = await calendarService.getUpcomingEvents(calendarId, maxResults)

      console.log("[Calendar Upcoming] Events fetched:", {
        count: events?.length || 0,
        eventIds: events?.map((e) => e.id) || [],
      })

      // Check if token was refreshed and update cookie
      const currentCredentials = calendarService.getCredentials()
      if (currentCredentials.access_token && currentCredentials.access_token !== accessToken) {
        console.log("[Calendar Upcoming] Token was refreshed, updating cookie")
        const expiresIn = currentCredentials.expiry_date
          ? new Date(currentCredentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000)

        cookieStore.set("google_calendar_access_token", currentCredentials.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          expires: expiresIn,
          path: "/",
        })
      }

      return successResponse(events)
    } catch (error) {
      console.error("[Calendar Upcoming] Error fetching events:", error)
      throw error
    }
  } catch (error) {
    console.error("[Calendar Upcoming] Unhandled error:", error)
    return handleApiError(error)
  }
}
