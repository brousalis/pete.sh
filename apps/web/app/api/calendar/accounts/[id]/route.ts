/**
 * Calendar Account by ID API
 * DELETE - Disconnect account (revoke Google token + delete row)
 * PATCH  - Update account settings (selected_calendars, is_active, display_name)
 */

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { calendarAccountsService } from '@/lib/services/calendar-accounts.service'
import { NextRequest } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const account = await calendarAccountsService.getAccountById(id)

    if (!account) {
      return errorResponse('Account not found', 404)
    }

    // Attempt to revoke the token with Google
    const tokenToRevoke = account.access_token || account.refresh_token
    if (tokenToRevoke) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      } catch (revokeError) {
        console.warn('[Calendar Accounts] Token revocation failed (continuing with delete):', revokeError)
      }
    }

    await calendarAccountsService.deleteAccount(id)

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('[Calendar Accounts] DELETE error:', error)
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await calendarAccountsService.getAccountById(id)
    if (!existing) {
      return errorResponse('Account not found', 404)
    }

    const allowedKeys = ['selected_calendars', 'is_active', 'display_name'] as const
    const updates: Record<string, unknown> = {}

    for (const key of allowedKeys) {
      if (key in body) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No valid fields to update', 400)
    }

    const updated = await calendarAccountsService.updateAccount(id, updates)

    return successResponse({
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name,
      is_active: updated.is_active,
      needs_reauth: updated.needs_reauth,
      selected_calendars: updated.selected_calendars,
    })
  } catch (error) {
    console.error('[Calendar Accounts] PATCH error:', error)
    return handleApiError(error)
  }
}
