/**
 * Calendar Sync API
 * POST /api/concerts/sync-calendar - Sync concerts from Google Calendar
 */

import { ConcertsService } from '@/lib/services/concerts.service'
import { CalendarService, loadCalendarTokensFromCookies } from '@/lib/services/calendar.service'
import { config } from '@/lib/config'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/utils'

const concertsService = new ConcertsService()

export async function POST() {
  try {
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      return errorResponse('Google Calendar not configured', 400)
    }

    // Load tokens
    const { accessToken } = await loadCalendarTokensFromCookies(calendarService)
    if (!accessToken) {
      return errorResponse('Not authenticated with Google Calendar', 401)
    }

    // Determine which calendar to sync from
    const calendarId = config.concerts.calendarId || config.google.calendarId

    // Fetch upcoming events (this gets future events)
    // For past concerts, users would add them manually or we'd need a broader query
    const events = await calendarService.getEvents(calendarId, 100)

    // Filter out cancelled events
    const activeEvents = events.filter((e) => e.status !== 'cancelled')

    const result = await concertsService.syncFromCalendar(activeEvents)

    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
