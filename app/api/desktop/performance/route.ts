import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { DesktopService } from "@/lib/services/desktop.service"

const desktopService = new DesktopService()

export async function GET(request: NextRequest) {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse("Desktop features not available", 400)
    }

    const performance = await desktopService.getPerformance()
    return successResponse(performance)
  } catch (error) {
    return handleApiError(error)
  }
}
