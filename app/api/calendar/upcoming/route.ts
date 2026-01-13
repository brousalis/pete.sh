import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { CalendarService } from "@/lib/services/calendar.service"
import { google } from "googleapis"
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      return errorResponse("Google Calendar not configured", 400)
    }

    // Get tokens from cookies
    const cookieStore = await cookies()
    let accessToken = cookieStore.get("google_calendar_access_token")?.value
    const refreshToken = cookieStore.get("google_calendar_refresh_token")?.value

    if (!accessToken) {
      return errorResponse("Not authenticated. Please authorize Google Calendar access.", 401)
    }

    // Set credentials on the service
    calendarService.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const searchParams = request.nextUrl.searchParams
    const hours = searchParams.get("hours") ? parseInt(searchParams.get("hours")!) : 24
    const calendarId = searchParams.get("calendarId") || config.google.calendarId

    try {
      const events = await calendarService.getUpcomingEvents(calendarId, hours)

      // Check if token was refreshed and update cookie
      const currentCredentials = calendarService.getCredentials()
      if (currentCredentials.access_token && currentCredentials.access_token !== accessToken) {
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
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}
