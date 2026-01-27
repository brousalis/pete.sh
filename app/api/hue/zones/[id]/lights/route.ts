import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

/**
 * GET /api/hue/zones/[id]/lights - Get all lights in a zone
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const lights = await hueService.getLightsForZone(id)
    return successResponse(lights)
  } catch (error) {
    return handleApiError(error)
  }
}
