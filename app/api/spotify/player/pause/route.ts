import { NextRequest } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/utils"
import { getSpotifyAdapter } from "@/lib/adapters"
import { localModeGuard } from "@/lib/utils/mode"

/**
 * Pause playback (local mode only)
 */
export async function POST(request: NextRequest) {
  try {
    // Guard: Only allow in local mode
    const guard = localModeGuard()
    if (!guard.allowed) {
      return errorResponse(guard.error ?? "Controls disabled in production mode", 403)
    }

    const adapter = getSpotifyAdapter()
    
    if (!adapter.isConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { authenticated } = await adapter.initializeWithTokens()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const body = await request.json().catch(() => ({}))
    await adapter.pause(body.deviceId)

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Spotify Pause] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to pause", 500)
  }
}
