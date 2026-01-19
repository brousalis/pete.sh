import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { DesktopService } from '@/lib/services/desktop.service'

const desktopService = new DesktopService()

export async function POST() {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse('Desktop features not available', 400)
    }

    await desktopService.switchDisplay()
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
