import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CalendarService } from "@/lib/services/calendar.service"

/**
 * Initiate Google Calendar OAuth flow
 * Redirects user to Google's authorization page
 *
 * Also handles OAuth callback if code is present (fallback for misconfigured redirect URIs)
 */
export async function GET(request: NextRequest) {
  try {
    const calendarService = new CalendarService()

    if (!calendarService.isConfigured()) {
      return NextResponse.json({ error: "Google Calendar not configured" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    // If we receive a code or error, redirect to the callback handler
    // This handles cases where Google Cloud Console redirect URI is misconfigured
    if (code || error) {
      const callbackUrl = new URL("/api/calendar/callback", request.url)
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value)
      })
      return NextResponse.redirect(callbackUrl)
    }

    // Check query params for force consent
    const forceParam = searchParams.get("force") === "true"

    // Check if we already have a refresh token
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get("google_calendar_refresh_token")?.value
    const hasRefreshToken = !!refreshToken

    // ALWAYS force consent to ensure we get a refresh token
    // Google only returns refresh tokens on first auth or with prompt=consent
    // This ensures tokens persist across app rebuilds/restarts
    const forceConsent = true // Always force to guarantee refresh token

    console.log("[Calendar Auth] Initiating OAuth:", {
      hasRefreshToken,
      forceParam,
      forceConsent,
      note: "Always forcing consent to ensure refresh token is obtained"
    })

    // Initiate OAuth flow with consent to ensure refresh token
    const authUrl = calendarService.getAuthUrl(forceConsent)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Calendar OAuth initiation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
}
