/**
 * Calendar Sync API
 * POST /api/concerts/sync-calendar - Sync concerts from Google Calendar
 */

import { ConcertsService } from '@/lib/services/concerts.service'
import { CalendarService, loadCalendarTokensFromCookies } from '@/lib/services/calendar.service'
import { calendarAccountsService } from '@/lib/services/calendar-accounts.service'
import { config } from '@/lib/config'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/utils'

const concertsService = new ConcertsService()

export async function POST() {
  try {
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      return errorResponse('Google Calendar not configured', 400)
    }

    const calendarId = config.concerts.calendarId || config.google.calendarId

    // Try multi-account mode first: find the account that has the concerts calendar
    let authenticated = false
    try {
      const accounts = await calendarAccountsService.listActiveAccounts()
      if (accounts.length > 0) {
        // Find account whose selected_calendars contains the concerts calendarId,
        // or fall back to the first active account
        const targetAccount =
          accounts.find(a =>
            a.selected_calendars?.some(c => c.calendarId === calendarId)
          ) ?? accounts[0]!

        calendarService.setCredentials({
          access_token: targetAccount.access_token,
          refresh_token: targetAccount.refresh_token ?? undefined,
        })
        authenticated = true
      }
    } catch {
      // DB not available, fall through to legacy mode
    }

    // Legacy fallback: load from cookies/file
    if (!authenticated) {
      const { accessToken } = await loadCalendarTokensFromCookies(calendarService)
      if (!accessToken) {
        return errorResponse('Not authenticated with Google Calendar', 401)
      }
    }

    const events = await calendarService.getEvents(calendarId, 100)
    const activeEvents = events.filter((e) => e.status !== 'cancelled')

    const result = await concertsService.syncFromCalendar(activeEvents)

    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
