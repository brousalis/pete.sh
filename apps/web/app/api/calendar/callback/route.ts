import { config } from '@/lib/config'
import { setGoogleCalendarTokens } from '@/lib/services/token-storage'
import { auth } from '@googleapis/calendar'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth callback handler for Google Calendar
 * This route handles the OAuth redirect from Google after user authorization
 *
 * Stores tokens in:
 * 1. File-based storage (for cross-origin requests from pete.sh to localhost)
 * 2. httpOnly cookies (for same-origin requests as backup)
 */
export async function GET(request: NextRequest) {
  // Derive the app base URL from the request origin (since Google redirected the browser here)
  // This ensures we redirect back to the same origin the user started from
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

    console.log('[Calendar Callback] Received:', {
      code: code ? 'present' : 'missing',
      error,
      appBaseUrl,
    })

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, appBaseUrl)
      )
    }

    // Exchange authorization code for tokens
    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      )
    }

    // Derive redirect URI from the request URL itself
    // Since Google redirected the browser here, the request origin matches what was
    // used in the auth route's getAuthUrl() call
    const requestUrl = new URL(request.url)
    const redirectUri = `${requestUrl.origin}/api/calendar/callback`

    console.log('[Calendar Callback] Using redirect URI derived from request:', redirectUri)

    const oauth2Client = new auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      redirectUri
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    console.log('[Calendar Callback] OAuth tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
    })

    // Store tokens in file-based storage (for cross-origin requests)
    setGoogleCalendarTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    })

    // Also store in httpOnly cookies (for same-origin requests as backup)
    const cookieStore = await cookies()

    // Store access token (expires when token expires, or in 1 hour as fallback)
    const expiresIn = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // 1 hour fallback

    console.log(
      '[Calendar Callback] Storing access token, expires:',
      expiresIn.toISOString()
    )

    cookieStore.set('google_calendar_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresIn,
      path: '/',
    })

    // Store refresh token if available (longer expiry)
    // Note: Google only provides refresh token on first authorization or when prompt=consent is used
    if (tokens.refresh_token) {
      const refreshExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      console.log(
        '[Calendar Callback] Storing refresh token in cookie, expires:',
        refreshExpiry.toISOString()
      )
      cookieStore.set('google_calendar_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: refreshExpiry,
        path: '/',
      })
    } else {
      // Check if we already have a refresh token stored
      const existingRefreshToken = cookieStore.get(
        'google_calendar_refresh_token'
      )?.value
      if (existingRefreshToken) {
        console.log(
          '[Calendar Callback] No new refresh token, but keeping existing one'
        )
      } else {
        console.warn(
          '[Calendar Callback] WARNING: No refresh token received and none exists! User will need to re-authenticate when access token expires.'
        )
        console.warn(
          "[Calendar Callback] This usually means the OAuth flow didn't use prompt=consent. The auth route should force this."
        )
      }
    }

    // Redirect to home or calendar page
    return NextResponse.redirect(new URL('/calendar?auth=success', appBaseUrl))
  } catch (error) {
    console.error('[Calendar Callback] OAuth error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Calendar authentication failed'
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(errorMessage)}`, appBaseUrl)
    )
  }
}
