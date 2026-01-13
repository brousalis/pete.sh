import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { DesktopService } from "@/lib/services/desktop.service"

const desktopService = new DesktopService()

export async function POST(request: NextRequest) {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse("Desktop features not available", 400)
    }

    await desktopService.switchDisplay()
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
