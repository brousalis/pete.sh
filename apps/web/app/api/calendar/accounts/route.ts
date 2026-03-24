/**
 * Calendar Accounts API
 * GET  - List all connected Google Calendar accounts (tokens stripped)
 * POST - Upsert account (used internally by OAuth callback)
 */

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { calendarAccountsService } from '@/lib/services/calendar-accounts.service'
import { NextRequest } from 'next/server'

export async function GET() {
  try {
    const accounts = await calendarAccountsService.listAccounts()
    return successResponse({ accounts })
  } catch (error) {
    console.error('[Calendar Accounts] GET error:', error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.email || !body.access_token) {
      return errorResponse('email and access_token are required', 400)
    }

    const account = await calendarAccountsService.upsertAccount({
      email: body.email,
      display_name: body.display_name ?? null,
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? null,
      expiry_date: body.expiry_date ?? null,
      selected_calendars: body.selected_calendars ?? [],
    })

    return successResponse({
      id: account.id,
      email: account.email,
      display_name: account.display_name,
    }, 201)
  } catch (error) {
    console.error('[Calendar Accounts] POST error:', error)
    return handleApiError(error)
  }
}
