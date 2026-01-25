import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

/**
 * GET /api/hue/all - Get status of all lights
 */
export async function GET() {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const status = await hueService.getAllLightsStatus()
    return successResponse(status)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/hue/all - Toggle all lights on/off
 */
export async function POST(request: NextRequest) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const body = await request.json()
    const { on, brightness } = body

    if (typeof on !== "boolean") {
      return errorResponse("'on' must be a boolean", 400)
    }

    // If brightness is provided, set it along with turning on
    if (on && typeof brightness === "number") {
      const result = await hueService.setAllBrightness(brightness)
      return successResponse(result)
    }

    const result = await hueService.toggleAllLights(on)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
