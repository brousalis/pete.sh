import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse, getJsonBody } from "@/lib/api/utils"

interface CreatePlaylistBody {
  name: string
  description?: string
  public?: boolean
}

/**
 * Create a new playlist
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSpotifyConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const body = await getJsonBody<CreatePlaylistBody>(request)

    if (!body.name || typeof body.name !== "string") {
      return errorResponse("Playlist name is required", 400)
    }

    // Get current user to get their ID
    const user = await service.getCurrentUser()

    const playlist = await service.createPlaylist(user.id, body.name, {
      description: body.description,
      public: body.public,
    })

    return successResponse(playlist, 201)
  } catch (error) {
    console.error("[Spotify Create Playlist] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to create playlist", 500)
  }
}
