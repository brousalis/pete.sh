import { successResponse } from "@/lib/api/utils"
import { getSonosAdapter } from "@/lib/adapters"
import { isProductionMode } from "@/lib/utils/mode"

export async function GET() {
  try {
    const adapter = getSonosAdapter()
    
    // In production mode, read from cache
    if (isProductionMode()) {
      const nowPlaying = await adapter.getAllNowPlaying()
      return successResponse(nowPlaying)
    }

    // In local mode, check if configured and get real data
    if (!adapter.isConfigured()) {
      return successResponse([])
    }
    
    const players = await adapter.getPlayers()
    return successResponse(players)
  } catch (error) {
    // Fail silently - return empty array if Sonos is unreachable
    // This is expected when the Sonos system is offline or on a different network
    console.debug("[Sonos] Service unavailable:", error instanceof Error ? error.message : "Unknown error")
    return successResponse([])
  }
}
