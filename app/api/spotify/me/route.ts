import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"
import { successResponse, errorResponse } from "@/lib/api/utils"

const spotifyService = new SpotifyService()

/**
 * Helper to load and refresh tokens if needed
 */
async function loadTokens() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("spotify_access_token")?.value
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value
  const expiresAt = cookieStore.get("spotify_expires_at")?.value

  if (!accessToken && !refreshToken) {
    return { authenticated: false }
  }

  // Check if token needs refresh
  const needsRefresh = expiresAt
    ? parseInt(expiresAt, 10) < Date.now() + 60 * 1000 // Refresh 1 min early
    : !accessToken

  if (needsRefresh && refreshToken) {
    try {
      const tokens = await spotifyService.refreshAccessToken(refreshToken)
      const newExpiresAt = Date.now() + tokens.expires_in * 1000

      cookieStore.set("spotify_access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokens.expires_in,
        path: "/",
      })

      cookieStore.set("spotify_expires_at", newExpiresAt.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokens.expires_in,
        path: "/",
      })

      if (tokens.refresh_token) {
        cookieStore.set("spotify_refresh_token", tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 365 * 24 * 60 * 60,
          path: "/",
        })
      }

      spotifyService.setCredentials(tokens.access_token, tokens.refresh_token)
      return { authenticated: true }
    } catch {
      // Clear invalid tokens
      cookieStore.delete("spotify_access_token")
      cookieStore.delete("spotify_refresh_token")
      cookieStore.delete("spotify_expires_at")
      return { authenticated: false }
    }
  }

  if (accessToken) {
    spotifyService.setCredentials(accessToken, refreshToken)
    return { authenticated: true }
  }

  return { authenticated: false }
}

/**
 * Get current Spotify user profile
 */
export async function GET() {
  try {
    if (!spotifyService.isConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { authenticated } = await loadTokens()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const user = await spotifyService.getCurrentUser()
    return successResponse(user)
  } catch (error) {
    console.error("[Spotify Me] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired. Please reconnect to Spotify.", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get user", 500)
  }
}
