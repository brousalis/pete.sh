/**
 * Shared Spotify authentication utilities
 * Handles token loading, refreshing, and cookie management
 */

import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

/**
 * Load and refresh Spotify tokens as needed
 * Returns the spotify service instance with credentials set
 */
export async function getAuthenticatedSpotifyService(): Promise<{
  service: SpotifyService
  authenticated: boolean
}> {
  const spotifyService = new SpotifyService()

  if (!spotifyService.isConfigured()) {
    return { service: spotifyService, authenticated: false }
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get("spotify_access_token")?.value
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value
  const expiresAt = cookieStore.get("spotify_expires_at")?.value

  // No tokens at all - not authenticated
  if (!accessToken && !refreshToken) {
    return { service: spotifyService, authenticated: false }
  }

  // Check if we need to refresh
  // Refresh if: no access token, OR token expires within 5 minutes
  const needsRefresh = !accessToken || (expiresAt && parseInt(expiresAt, 10) < Date.now() + 5 * 60 * 1000)

  if (needsRefresh && refreshToken) {
    try {
      console.log("[Spotify Auth] Refreshing access token...")
      const tokens = await spotifyService.refreshAccessToken(refreshToken)
      const newExpiresAt = Date.now() + tokens.expires_in * 1000

      // Set access token cookie
      cookieStore.set("spotify_access_token", tokens.access_token, {
        ...COOKIE_OPTIONS,
        maxAge: tokens.expires_in,
      })

      // Set expiration timestamp (keep it longer so we know when to refresh)
      cookieStore.set("spotify_expires_at", newExpiresAt.toString(), {
        ...COOKIE_OPTIONS,
        maxAge: 365 * 24 * 60 * 60, // Keep for 1 year to track expiration
      })

      // Update refresh token if a new one was provided
      if (tokens.refresh_token) {
        cookieStore.set("spotify_refresh_token", tokens.refresh_token, {
          ...COOKIE_OPTIONS,
          maxAge: 365 * 24 * 60 * 60, // 1 year
        })
      }

      spotifyService.setCredentials(tokens.access_token, tokens.refresh_token || refreshToken)
      console.log("[Spotify Auth] Token refreshed successfully")
      return { service: spotifyService, authenticated: true }
    } catch (error) {
      console.error("[Spotify Auth] Token refresh failed:", error)
      // Clear all tokens on refresh failure
      cookieStore.delete("spotify_access_token")
      cookieStore.delete("spotify_refresh_token")
      cookieStore.delete("spotify_expires_at")
      return { service: spotifyService, authenticated: false }
    }
  }

  // We have a valid access token
  if (accessToken) {
    spotifyService.setCredentials(accessToken, refreshToken)
    return { service: spotifyService, authenticated: true }
  }

  return { service: spotifyService, authenticated: false }
}

/**
 * Check if Spotify is configured
 */
export function isSpotifyConfigured(): boolean {
  const spotifyService = new SpotifyService()
  return spotifyService.isConfigured()
}
