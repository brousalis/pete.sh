import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Get user's saved tracks from their library
 * Query params:
 *   - limit: number of tracks per page (max 50, default 50)
 *   - offset: starting index (default 0)
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
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const savedTracks = await service.getSavedTracks(limit, offset)
    return successResponse(savedTracks)
  } catch (error) {
    console.error("[Spotify Saved Tracks] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get saved tracks", 500)
  }
}
