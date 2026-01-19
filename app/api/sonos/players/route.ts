import { NextRequest } from "next/server"
import { successResponse } from "@/lib/api/utils"
import { SonosService } from "@/lib/services/sonos.service"

const sonosService = new SonosService()

export async function GET(request: NextRequest) {
  try {
    // Check if Sonos is configured
    if (!sonosService.isConfigured()) {
      return successResponse([])
    }
    const players = await sonosService.getPlayers()
    return successResponse(players)
  } catch (error) {
    // Fail silently - return empty array if Sonos is unreachable
    // This is expected when the Sonos system is offline or on a different network
    console.debug("[Sonos] Service unavailable:", error instanceof Error ? error.message : "Unknown error")
    return successResponse([])
  }
}
