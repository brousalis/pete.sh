/**
 * Shared Spotify authentication utilities
 * Handles token loading, refreshing, and cookie management
 */

import { cookies } from "next/headers"
import { SpotifyService } from "@/lib/services/spotify.service"
import { getSpotifyTokens, setSpotifyTokens, clearSpotifyTokens } from "@/lib/services/token-storage"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

/**
 * Load and refresh Spotify tokens as needed
 * First checks file-based storage (for cross-origin requests from pete.sh)
 * Falls back to cookies (for same-origin requests)
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

  // First try file-based storage (works for cross-origin requests)
  const fileTokens = getSpotifyTokens()
  
  // Fall back to cookies if file storage is empty
  const cookieStore = await cookies()
  const cookieAccessToken = cookieStore.get("spotify_access_token")?.value
  const cookieRefreshToken = cookieStore.get("spotify_refresh_token")?.value
  const cookieExpiresAt = cookieStore.get("spotify_expires_at")?.value
  
  // Use file tokens if available, otherwise use cookies
  let accessToken = fileTokens.accessToken || cookieAccessToken || null
  const refreshToken = fileTokens.refreshToken || cookieRefreshToken || null
  const expiresAt = fileTokens.expiryDate || (cookieExpiresAt ? parseInt(cookieExpiresAt, 10) : null)

  console.log("[Spotify Auth] Loading tokens:", {
    fromFile: { hasAccessToken: !!fileTokens.accessToken, hasRefreshToken: !!fileTokens.refreshToken },
    fromCookies: { hasAccessToken: !!cookieAccessToken, hasRefreshToken: !!cookieRefreshToken },
    using: { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken },
  })

  // No tokens at all - not authenticated
  if (!accessToken && !refreshToken) {
    return { service: spotifyService, authenticated: false }
  }

  // Check if we need to refresh
  // Refresh if: no access token, OR token expires within 5 minutes
  const needsRefresh = !accessToken || (expiresAt && expiresAt < Date.now() + 5 * 60 * 1000)

  if (needsRefresh && refreshToken) {
    try {
      console.log("[Spotify Auth] Refreshing access token...")
      const tokens = await spotifyService.refreshAccessToken(refreshToken)
      const newExpiresAt = Date.now() + tokens.expires_in * 1000

      // Save to file storage (for cross-origin requests)
      setSpotifyTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken,
        expiry_date: newExpiresAt,
      })

      // Also save to cookies (for same-origin as backup)
      cookieStore.set("spotify_access_token", tokens.access_token, {
        ...COOKIE_OPTIONS,
        maxAge: tokens.expires_in,
      })

      cookieStore.set("spotify_expires_at", newExpiresAt.toString(), {
        ...COOKIE_OPTIONS,
        maxAge: 365 * 24 * 60 * 60,
      })

      if (tokens.refresh_token) {
        cookieStore.set("spotify_refresh_token", tokens.refresh_token, {
          ...COOKIE_OPTIONS,
          maxAge: 365 * 24 * 60 * 60,
        })
      }

      spotifyService.setCredentials(tokens.access_token, tokens.refresh_token || refreshToken)
      console.log("[Spotify Auth] Token refreshed successfully")
      return { service: spotifyService, authenticated: true }
    } catch (error) {
      console.error("[Spotify Auth] Token refresh failed:", error)
      // Clear all tokens on refresh failure
      clearSpotifyTokens()
      cookieStore.delete("spotify_access_token")
      cookieStore.delete("spotify_refresh_token")
      cookieStore.delete("spotify_expires_at")
      return { service: spotifyService, authenticated: false }
    }
  }

  // We have a valid access token
  if (accessToken) {
    spotifyService.setCredentials(accessToken, refreshToken || undefined)
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
