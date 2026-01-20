import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"

const spotifyService = new SpotifyService()

/**
 * OAuth callback handler for Spotify
 * Exchanges the authorization code for access and refresh tokens
 */
export async function GET(request: NextRequest) {
  try {
    if (!spotifyService.isConfigured()) {
      return NextResponse.json(
        { error: "Spotify not configured" },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    console.log("[Spotify Callback] Received:", {
      code: code ? "present" : "missing",
      state: state ? "present" : "missing",
      error,
    })

    // Handle OAuth errors
    if (error) {
      return NextResponse.json(
        { error: `Spotify authorization error: ${error}` },
        { status: 400 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    // Verify state parameter if present
    const storedState = cookieStore.get("spotify_auth_state")?.value
    if (state && storedState && state !== storedState) {
      return NextResponse.json(
        { error: "State mismatch - possible CSRF attack" },
        { status: 400 }
      )
    }

    // Clear the state cookie
    cookieStore.delete("spotify_auth_state")

    // Exchange code for tokens
    const tokens = await spotifyService.exchangeCode(code)

    console.log("[Spotify Callback] Tokens received:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
    })

    // Calculate expiration time
    const expiresAt = Date.now() + tokens.expires_in * 1000

    // Store access token
    cookieStore.set("spotify_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in,
      path: "/",
    })

    // Store refresh token (longer expiry)
    if (tokens.refresh_token) {
      cookieStore.set("spotify_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
      })
    }

    // Store expiration timestamp (keep longer so we know when to refresh even after access token expires)
    cookieStore.set("spotify_expires_at", expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year - same as refresh token
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Spotify Callback] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete authorization" },
      { status: 500 }
    )
  }
}
