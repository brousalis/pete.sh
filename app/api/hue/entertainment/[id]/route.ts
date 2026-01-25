import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

/**
 * GET /api/hue/entertainment/[id] - Get entertainment area status
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
    const status = await hueService.getEntertainmentStatus(id)
    return successResponse(status)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/hue/entertainment/[id] - Toggle entertainment mode
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const body = await request.json()
    const { active } = body

    if (typeof active !== "boolean") {
      return errorResponse("'active' must be a boolean", 400)
    }

    const result = await hueService.setEntertainmentMode(id, active)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
