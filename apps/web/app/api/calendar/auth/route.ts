import { CalendarService } from '@/lib/services/calendar.service'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Initiate Google Calendar OAuth flow
 * Redirects user to Google's authorization page
 *
 * Supports multi-account: always forces consent so we get a new refresh token.
 * CSRF protection via nonce in state param verified against httpOnly cookie.
 * Accepts ?returnTo= to redirect back to the originating page after OAuth.
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const origin = requestUrl.origin
    const redirectUri = `${origin}/api/calendar/callback`

    const calendarService = new CalendarService(redirectUri)

    if (!calendarService.isConfigured()) {
      return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // If we receive a code or error, redirect to the callback handler
    if (code || error) {
      const callbackUrl = new URL('/api/calendar/callback', request.url)
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value)
      })
      return NextResponse.redirect(callbackUrl)
    }

    // Determine where to redirect after OAuth completes
    const returnTo = searchParams.get('returnTo') || '/calendar'

    // Generate CSRF nonce
    const nonce = randomBytes(16).toString('hex')

    const statePayload = JSON.stringify({ nonce, returnTo })
    const stateEncoded = Buffer.from(statePayload).toString('base64url')

    // Store nonce in httpOnly cookie for verification in callback
    const cookieStore = await cookies()
    cookieStore.set('calendar_auth_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    const authUrl = calendarService.getAuthUrl(true, stateEncoded)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[Calendar Auth] OAuth initiation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}
