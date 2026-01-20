import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Start or resume playback
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

    const body = await request.json().catch(() => ({}))
    const { deviceId, contextUri, uris, offset, positionMs } = body

    await service.play({
      deviceId,
      contextUri,
      uris,
      offset,
      positionMs,
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Spotify Play] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to play", 500)
  }
}
