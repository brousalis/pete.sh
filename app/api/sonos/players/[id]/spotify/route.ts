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
    const { uri } = body

    if (!uri) {
      return errorResponse("Spotify URI is required", 400)
    }

    const result = await sonosService.playSpotify(id, uri)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
