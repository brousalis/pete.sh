import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { google } from "googleapis"
import { config } from "@/lib/config"

/**
 * OAuth callback handler for Google Calendar
 * This route handles the OAuth redirect from Google after user authorization
 *
 * Stores tokens in httpOnly cookies for security
 */
export async function GET(request: NextRequest) {
  try {
    if (!config.google.isConfigured) {
      return NextResponse.json({ error: "Google Calendar not configured" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    console.log("[Calendar Callback] Received:", {
      code: code ? "present" : "missing",
      error,
      origin: request.nextUrl.origin,
    })

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url))
    }

    // Exchange authorization code for tokens
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 })
    }

    // Create OAuth2 client with dynamic redirect URI
    // IMPORTANT: Must match the redirect URI used in CalendarService.getAuthUrl()
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
      (process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
        : "http://localhost:3000/api/calendar/callback")

    console.log("[Calendar Callback] Using redirect URI:", redirectUri)

    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      redirectUri
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error("No access token received")
    }

    console.log("[Calendar Callback] OAuth tokens received:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    })

    // Store tokens in httpOnly cookies
    const cookieStore = await cookies()

    // Store access token (expires when token expires, or in 1 hour as fallback)
    const expiresIn = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // 1 hour fallback

    cookieStore.set("google_calendar_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresIn,
      path: "/",
    })

    // Store refresh token if available (longer expiry)
    // Note: Google only provides refresh token on first authorization or when prompt=consent is used
    if (tokens.refresh_token) {
      console.log("[Calendar Callback] Storing refresh token in cookie (1 year expiry)")
      cookieStore.set("google_calendar_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        path: "/",
      })
    } else {
      console.warn("[Calendar Callback] No refresh token received! User will need to re-authenticate when access token expires. Try /api/calendar/auth?force=true to get a new refresh token.")
    }

    // Redirect to home or calendar page
    return NextResponse.redirect(new URL("/calendar?auth=success", request.url))
  } catch (error) {
    console.error("[Calendar Callback] OAuth error:", error)
    const errorMessage = error instanceof Error ? error.message : "Calendar authentication failed"
    return NextResponse.redirect(new URL(`/calendar?error=${encodeURIComponent(errorMessage)}`, request.url))
  }
}
