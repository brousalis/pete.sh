import { errorResponse, handleApiError, successResponse } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"
import { NextRequest } from "next/server"

const hueService = new HueService()

/**
 * GET /api/hue/scenes - Get all scenes with zone information
 */
export async function GET(request: NextRequest) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get("name")

    // If searching by name
    if (name) {
      const scene = await hueService.findSceneByName(name)
      return successResponse(scene)
    }

    const scenes = await hueService.getAllScenesWithZones()
    return successResponse(scenes)
  } catch (error) {
    return handleApiError(error)
  }
}
