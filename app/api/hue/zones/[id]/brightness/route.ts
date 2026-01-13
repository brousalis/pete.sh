import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { HueService } from "@/lib/services/hue.service"

const hueService = new HueService()

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
    const { brightness } = body

    if (typeof brightness !== "number" || brightness < 1 || brightness > 254) {
      return errorResponse("Brightness must be a number between 1 and 254", 400)
    }

    const result = await hueService.setZoneBrightness(id, brightness)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
