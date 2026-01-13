import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { SonosService } from "@/lib/services/sonos.service"

const sonosService = new SonosService()

export async function GET(request: NextRequest) {
  try {
    const players = await sonosService.getPlayers()
    return successResponse(players)
  } catch (error) {
    return handleApiError(error)
  }
}
