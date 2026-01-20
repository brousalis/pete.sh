import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Get current Spotify user profile
 */
export async function GET() {
  try {
    if (!isSpotifyConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const user = await service.getCurrentUser()
    return successResponse(user)
  } catch (error) {
    console.error("[Spotify Me] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired. Please reconnect to Spotify.", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get user", 500)
  }
}
