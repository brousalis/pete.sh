/**
 * Calendar List per Account API
 * GET - Fetch available Google calendars for a specific account
 */

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { calendarAccountsService } from '@/lib/services/calendar-accounts.service'
import { CalendarService } from '@/lib/services/calendar.service'
import { NextRequest } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const account = await calendarAccountsService.getAccountById(id)

    if (!account) {
      return errorResponse('Account not found', 404)
    }

    if (account.needs_reauth) {
      return errorResponse('Account needs re-authentication', 401)
    }

    const calendarService = new CalendarService()
    if (!calendarService.isConfigured()) {
      return errorResponse('Google Calendar not configured', 400)
    }

    calendarService.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token ?? undefined,
    })

    const calendars = await calendarService.listCalendars()

    // If token was refreshed during the call, persist updated credentials
    const creds = calendarService.getCredentials()
    if (creds.access_token && creds.access_token !== account.access_token) {
      await calendarAccountsService.updateTokens(id, {
        access_token: creds.access_token,
        refresh_token: creds.refresh_token,
        expiry_date: creds.expiry_date,
      })
    }

    return successResponse({ calendars })
  } catch (error: any) {
    if (error?.message?.includes('Token refresh failed') || error?.message?.includes('invalid_grant')) {
      const { id } = await params
      await calendarAccountsService.markNeedsReauth(id)
      return errorResponse('Account authentication expired. Please re-authenticate.', 401)
    }

    console.error('[Calendar Accounts Calendars] GET error:', error)
    return handleApiError(error)
  }
}
