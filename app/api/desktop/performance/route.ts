import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { DesktopService } from '@/lib/services/desktop.service'

const desktopService = new DesktopService()

export async function GET() {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse('Desktop features not available', 400)
    }

    const performance = await desktopService.getPerformance()
    return successResponse(performance)
  } catch (error) {
    return handleApiError(error)
  }
}
