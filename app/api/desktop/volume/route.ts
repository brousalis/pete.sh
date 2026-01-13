import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { DesktopService } from "@/lib/services/desktop.service"

const desktopService = new DesktopService()

export async function GET(request: NextRequest) {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse("Desktop features not available", 400)
    }

    const volume = await desktopService.getVolume()
    return successResponse(volume)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse("Desktop features not available", 400)
    }

    const body = await request.json()
    const { volume } = body

    if (volume === undefined || volume < 0 || volume > 100) {
      return errorResponse("Volume must be between 0 and 100", 400)
    }

    await desktopService.setVolume(volume)
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
