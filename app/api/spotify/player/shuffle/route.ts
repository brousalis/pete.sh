import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Toggle shuffle
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
    const { state, deviceId } = body

    if (typeof state !== "boolean") {
      return errorResponse("State must be a boolean", 400)
    }

    await service.setShuffle(state, deviceId)

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Spotify Shuffle] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to toggle shuffle", 500)
  }
}
