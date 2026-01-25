import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Get audio features for tracks
 * Query params:
 *   - ids: comma-separated track IDs (required)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSpotifyConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const ids = searchParams.get("ids")

    if (!ids) {
      return errorResponse("Missing required parameter: ids", 400)
    }

    const trackIds = ids.split(",").filter(Boolean)
    if (trackIds.length === 0) {
      return errorResponse("No valid track IDs provided", 400)
    }

    const audioFeatures = await service.getAudioFeaturesForTracks(trackIds)
    return successResponse(audioFeatures)
  } catch (error) {
    console.error("[Spotify Audio Features] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get audio features", 500)
  }
}
