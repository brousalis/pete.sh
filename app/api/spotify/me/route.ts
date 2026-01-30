import { NextResponse } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getSpotifyAdapter } from "@/lib/adapters"
import { isProductionMode, isLocalMode } from "@/lib/utils/mode"

/**
 * Get current Spotify user profile
 */
export async function GET() {
  try {
    const adapter = getSpotifyAdapter()

    // In production mode (no local services), return cached user info
    if (isProductionMode()) {
      const cachedUser = await adapter.getCurrentUser()
      return successResponse({
        user: cachedUser,
        source: 'cache',
        authenticated: false,
        authAvailable: false,
      })
    }

    // Local mode - try to authenticate
    if (!isSpotifyConfigured()) {
      // Not configured - return cached data if available
      try {
        const cachedUser = await adapter.getCurrentUser()
        return successResponse({
          user: cachedUser,
          source: 'cache',
          authenticated: false,
          authAvailable: false,
          message: 'Spotify not configured',
        })
      } catch {
        return successResponse({
          user: null,
          source: 'none',
          authenticated: false,
          authAvailable: false,
          message: 'Spotify not configured',
        })
      }
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    
    if (!authenticated) {
      // Not authenticated in local mode - return cached data with auth prompt
      try {
        const cachedUser = await adapter.getCurrentUser()
        return NextResponse.json({
          success: true,
          data: {
            user: cachedUser,
            source: 'cache',
            authenticated: false,
            authAvailable: isLocalMode(),
            authUrl: '/api/spotify/auth',
            message: 'Using cached data. Authenticate to get real-time updates.',
          },
        })
      } catch {
        return NextResponse.json({
          success: true,
          data: {
            user: null,
            source: 'none',
            authenticated: false,
            authAvailable: isLocalMode(),
            authUrl: '/api/spotify/auth',
            message: 'Please authenticate to access Spotify.',
          },
        })
      }
    }

    // Authenticated - get live data
    const user = await service.getCurrentUser()
    return successResponse({
      user,
      source: 'live',
      authenticated: true,
      authAvailable: true,
    })
  } catch (error) {
    console.error("[Spotify Me] Error:", error)
    return handleApiError(error)
  }
}
