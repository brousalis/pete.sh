import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

export async function GET(request: NextRequest) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const lights = await hueService.getLights()
    return successResponse(lights)
  } catch (error) {
    return handleApiError(error)
  }
}
