import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const body = await request.json()

    const result = await hueService.setLightState(id, body)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
