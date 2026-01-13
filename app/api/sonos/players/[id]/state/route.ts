import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { SonosService } from "@/lib/services/sonos.service"

const sonosService = new SonosService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const state = await sonosService.getPlayerState(id)
    return successResponse(state)
  } catch (error) {
    return handleApiError(error)
  }
}
