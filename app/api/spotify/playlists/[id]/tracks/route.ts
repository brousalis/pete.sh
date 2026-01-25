import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse, getJsonBody } from "@/lib/api/utils"

interface AddTracksBody {
  uris: string[]
  position?: number
}

interface RemoveTracksBody {
  uris: string[]
}

/**
 * Add tracks to a playlist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSpotifyConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const { id: playlistId } = await params
    const body = await getJsonBody<AddTracksBody>(request)

    if (!body.uris || !Array.isArray(body.uris) || body.uris.length === 0) {
      return errorResponse("Track URIs array is required", 400)
    }

    const result = await service.addTracksToPlaylist(playlistId, body.uris, body.position)
    return successResponse(result)
  } catch (error) {
    console.error("[Spotify Add Tracks] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to add tracks", 500)
  }
}

/**
 * Remove tracks from a playlist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSpotifyConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const { id: playlistId } = await params
    const body = await getJsonBody<RemoveTracksBody>(request)

    if (!body.uris || !Array.isArray(body.uris) || body.uris.length === 0) {
      return errorResponse("Track URIs array is required", 400)
    }

    const result = await service.removeTracksFromPlaylist(playlistId, body.uris)
    return successResponse(result)
  } catch (error) {
    console.error("[Spotify Remove Tracks] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to remove tracks", 500)
  }
}
