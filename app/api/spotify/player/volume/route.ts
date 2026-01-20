import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Set volume
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

    const body = await request.json()
    const { volume, deviceId } = body

    if (typeof volume !== "number" || volume < 0 || volume > 100) {
      return errorResponse("Volume must be between 0 and 100", 400)
    }

    await service.setVolume(volume, deviceId)

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Spotify Volume] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to set volume", 500)
  }
}
