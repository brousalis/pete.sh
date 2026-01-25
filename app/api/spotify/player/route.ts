import { successResponse, errorResponse } from "@/lib/api/utils"
import { getSpotifyAdapter } from "@/lib/adapters"
import { isProductionMode } from "@/lib/utils/mode"

/**
 * Get current playback state
 */
export async function GET() {
  try {
    const adapter = getSpotifyAdapter()
    
    // In production mode, read from cache without auth
    if (isProductionMode()) {
      const nowPlaying = await adapter.getNowPlaying()
      return successResponse(nowPlaying)
    }

    // In local mode, need to authenticate and fetch real data
    if (!adapter.isConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { authenticated } = await adapter.initializeWithTokens()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const playbackState = await adapter.getPlaybackState()
    return successResponse(playbackState)
  } catch (error) {
    console.error("[Spotify Player] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get playback", 500)
  }
}
