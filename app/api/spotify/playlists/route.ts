import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"
import { successResponse, errorResponse } from "@/lib/api/utils"

const spotifyService = new SpotifyService()

async function loadTokens() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("spotify_access_token")?.value
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value
  const expiresAt = cookieStore.get("spotify_expires_at")?.value

  if (!accessToken && !refreshToken) {
    return { authenticated: false }
  }

  const needsRefresh = expiresAt
    ? parseInt(expiresAt, 10) < Date.now() + 60 * 1000
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
 * Get user's playlists
 */
export async function GET(request: NextRequest) {
  try {
    if (!spotifyService.isConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { authenticated } = await loadTokens()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const playlists = await spotifyService.getPlaylists(limit, offset)
    return successResponse(playlists)
  } catch (error) {
    console.error("[Spotify Playlists] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get playlists", 500)
  }
}
