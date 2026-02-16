import { calendar_v3 } from '@googleapis/calendar'
import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { config } from '@/lib/config'
import { CalendarService } from '@/lib/services/calendar.service'
import { cookies } from 'next/headers'

/**
 * Debug endpoint to help diagnose calendar issues
 * Returns information about calendars, events, and configuration
 */
export async function GET() {
  try {
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      return errorResponse('Google Calendar not configured', 400)
    }

    // Get tokens from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('google_calendar_access_token')?.value
    const refreshToken = cookieStore.get('google_calendar_refresh_token')?.value

    if (!accessToken) {
      return errorResponse('Not authenticated', 401)
    }

    // Set credentials and use the service's calendar client
    calendarService.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const calendar = calendarService.getCalendar()
    if (!calendar) {
      return errorResponse('Calendar client not available', 500)
    }

    // Get calendar list
    const calendarList = await calendar.calendarList.list()
    const calendars = calendarList.data.items || []

    // Get events from primary calendar (no time restriction)
    const now = new Date()
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const allEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: oneWeekLater.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const upcomingEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return successResponse({
      config: {
        isConfigured: config.google.isConfigured,
        calendarId: config.google.calendarId,
        hasClientId: !!config.google.clientId,
        hasClientSecret: !!config.google.clientSecret,
      },
      auth: {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      },
      calendars: calendars.map((cal: calendar_v3.Schema$CalendarListEntry) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        timeZone: cal.timeZone,
        accessRole: cal.accessRole,
      })),
      events: {
        nextWeek: {
          count: allEventsResponse.data.items?.length || 0,
          events: (allEventsResponse.data.items || []).slice(0, 5).map((e: calendar_v3.Schema$Event) => ({
            id: e.id,
            summary: e.summary,
            start: e.start?.dateTime || e.start?.date,
            status: e.status,
          })),
        },
        upcoming: {
          count: upcomingEventsResponse.data.items?.length || 0,
          events: (upcomingEventsResponse.data.items || []).map((e: calendar_v3.Schema$Event) => ({
            id: e.id,
            summary: e.summary,
            start: e.start?.dateTime || e.start?.date,
            status: e.status,
          })),
        },
      },
      timeRange: {
        now: now.toISOString(),
        oneWeekLater: oneWeekLater.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    })
  } catch (error) {
    console.error('[Calendar Debug] Error:', error)
    return handleApiError(error)
  }
}
