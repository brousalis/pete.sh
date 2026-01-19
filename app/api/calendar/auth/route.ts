import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CalendarService } from "@/lib/services/calendar.service"

const calendarService = new CalendarService()

/**
 * Initiate Google Calendar OAuth flow
 * Redirects user to Google's authorization page
 *
 * Also handles OAuth callback if code is present (fallback for misconfigured redirect URIs)
 */
export async function GET(request: NextRequest) {
  try {
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
    const hasRefreshToken = !!cookieStore.get("google_calendar_refresh_token")?.value

    // Always force consent to ensure we get a refresh token
    // Google only returns refresh tokens when consent is explicitly granted
    // Without this, users have to re-auth every hour when access token expires
    const forceConsent = !hasRefreshToken || forceParam

    console.log("[Calendar Auth] Initiating OAuth:", {
      hasRefreshToken,
      forceParam,
      forceConsent,
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
