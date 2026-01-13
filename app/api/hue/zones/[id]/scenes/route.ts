import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const scenes = await hueService.getScenesForZone(id)
    return successResponse(scenes)
  } catch (error) {
    return handleApiError(error)
  }
}
