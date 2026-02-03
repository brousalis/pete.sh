import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

/**
 * GET /api/hue/entertainment - Get all entertainment areas
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
      const area = await hueService.getEntertainmentAreaByName(name)
      return successResponse(area)
    }

    const areas = await hueService.getEntertainmentAreas()
    return successResponse(areas)
  } catch (error) {
    return handleApiError(error)
  }
}
