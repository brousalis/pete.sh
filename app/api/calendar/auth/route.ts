import { NextRequest, NextResponse } from "next/server"
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

    // Otherwise, initiate OAuth flow
    const authUrl = calendarService.getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Calendar OAuth initiation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
}
