import { config } from '@/lib/config'
import { calendarAccountsService } from '@/lib/services/calendar-accounts.service'
import { CalendarService } from '@/lib/services/calendar.service'
import { setGoogleCalendarTokens } from '@/lib/services/token-storage'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Decode a JWT payload without verification (id_token from Google).
 * We trust the token because it was received directly from Google's token endpoint.
 */
function decodeIdToken(idToken: string): { email?: string; name?: string } {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return {}
    const payloadB64 = parts[1]
    if (!payloadB64) return {}
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))
    return { email: payload.email, name: payload.name }
  } catch {
    return {}
  }
}

/**
 * OAuth callback handler for Google Calendar
 * Handles the redirect from Google after user authorization.
 *
 * - Verifies CSRF nonce from state param against cookie
 * - Extracts email/name from id_token JWT
 * - Upserts account into calendar_accounts table
 * - Auto-fetches calendar list and populates selected_calendars
 * - Also writes to .tokens.json for backward compatibility
 * - Redirects to state.returnTo (defaults to /calendar)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const appBaseUrl = requestUrl.origin

  try {
    if (!config.google.isConfigured) {
      return NextResponse.json(
        { error: 'Google Calendar not configured' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const stateParam = searchParams.get('state')

    // Parse state
    let returnTo = '/calendar'
    let stateNonce: string | null = null
    if (stateParam) {
      try {
        const statePayload = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'))
        stateNonce = statePayload.nonce ?? null
        returnTo = statePayload.returnTo || '/calendar'
      } catch {
        console.warn('[Calendar Callback] Failed to parse state param')
      }
    }

    // Verify CSRF nonce
    const cookieStore = await cookies()
    const storedNonce = cookieStore.get('calendar_auth_nonce')?.value
    if (stateNonce && storedNonce && stateNonce !== storedNonce) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=${encodeURIComponent('CSRF verification failed')}`, appBaseUrl)
      )
    }
    // Clean up nonce cookie
    cookieStore.delete('calendar_auth_nonce')

    if (error) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=${encodeURIComponent(error)}`, appBaseUrl)
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      )
    }

    const redirectUri = `${requestUrl.origin}/api/calendar/callback`
    const calendarService = new CalendarService(redirectUri)

    // Exchange code for tokens
    const tokens = await calendarService.exchangeCode(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Extract email and name from id_token
    let email = 'unknown@gmail.com'
    let displayName: string | null = null
    if (tokens.id_token) {
      const decoded = decodeIdToken(tokens.id_token)
      if (decoded.email) email = decoded.email
      if (decoded.name) displayName = decoded.name
    }

    console.log('[Calendar Callback] OAuth tokens received for:', email)

    // Set credentials to fetch calendar list
    calendarService.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    // Auto-fetch calendar list for initial setup
    let selectedCalendars: Array<{
      calendarId: string
      name: string
      color?: string
      visible: boolean
      primary?: boolean
    }> = []
    try {
      const calendars = await calendarService.listCalendars()
      selectedCalendars = calendars.map(cal => ({
        calendarId: cal.id,
        name: cal.summary,
        color: cal.backgroundColor ?? undefined,
        visible: true,
        primary: cal.primary,
      }))
    } catch (listError) {
      console.warn('[Calendar Callback] Failed to fetch calendar list (will be populated later):', listError)
    }

    // Check if this account already exists to preserve user's calendar visibility selections
    const existingAccount = await calendarAccountsService.getAccountByEmail(email).catch(() => null)
    const finalSelectedCalendars = existingAccount?.selected_calendars?.length
      ? mergeCalendarSelections(existingAccount.selected_calendars, selectedCalendars)
      : selectedCalendars

    // Upsert into calendar_accounts
    await calendarAccountsService.upsertAccount({
      email,
      display_name: displayName,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      selected_calendars: finalSelectedCalendars,
    })

    // Backward compat: also write to .tokens.json and cookies
    setGoogleCalendarTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    })

    const expiresIn = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000)

    cookieStore.set('google_calendar_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresIn,
      path: '/',
    })

    if (tokens.refresh_token) {
      cookieStore.set('google_calendar_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        path: '/',
      })
    }

    // Add auth success param
    const separator = returnTo.includes('?') ? '&' : '?'
    return NextResponse.redirect(
      new URL(`${returnTo}${separator}calendar_auth=success`, appBaseUrl)
    )
  } catch (error) {
    console.error('[Calendar Callback] OAuth error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Calendar authentication failed'
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(errorMessage)}`, appBaseUrl)
    )
  }
}

/**
 * Merge existing user selections with freshly fetched calendar list.
 * Preserves user's visibility preferences for known calendars,
 * adds new calendars as visible by default.
 */
function mergeCalendarSelections(
  existing: Array<{ calendarId: string; name: string; color?: string; visible: boolean; primary?: boolean }>,
  fetched: Array<{ calendarId: string; name: string; color?: string; visible: boolean; primary?: boolean }>
): Array<{ calendarId: string; name: string; color?: string; visible: boolean; primary?: boolean }> {
  const existingMap = new Map(existing.map(c => [c.calendarId, c]))
  const merged = fetched.map(cal => {
    const prev = existingMap.get(cal.calendarId)
    if (prev) {
      return { ...cal, visible: prev.visible }
    }
    return cal
  })
  return merged
}
