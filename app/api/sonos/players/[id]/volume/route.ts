import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { SonosService } from "@/lib/services/sonos.service"

const sonosService = new SonosService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { volume } = body

    if (volume === undefined || volume < 0 || volume > 100) {
      return errorResponse("Volume must be between 0 and 100", 400)
    }

    const result = await sonosService.setVolume(id, volume)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
