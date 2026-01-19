import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"

const spotifyService = new SpotifyService()

/**
 * Initiate Spotify OAuth flow
 * Redirects user to Spotify's authorization page
 */
export async function GET() {
  try {
    if (!spotifyService.isConfigured()) {
      return NextResponse.json(
        { error: "Spotify not configured. Check NEXT_SPOTIFY_CLIENT_ID and NEXT_SPOTIFY_CLIENT_SECRET" },
        { status: 400 }
      )
    }

    // Check if we already have a valid token
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("spotify_access_token")?.value
    const expiresAt = cookieStore.get("spotify_expires_at")?.value

    // If we have a valid non-expired token, redirect to music page
    if (accessToken && expiresAt && parseInt(expiresAt, 10) > Date.now()) {
      return NextResponse.redirect(new URL("/music?spotify=connected", process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"))
    }

    // Generate a state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15)
    
    // Store state in cookie for verification
    cookieStore.set("spotify_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    })

    const authUrl = spotifyService.getAuthUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("[Spotify Auth] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
}
