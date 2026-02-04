import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { DesktopService } from '@/lib/services/desktop.service'
import { NextRequest } from 'next/server'

const desktopService = new DesktopService()

export async function GET() {
  try {
    if (!desktopService.isAvailable()) {
      return errorResponse('Desktop features not available (requires Windows server)', 400)
    }

    const currentInput = await desktopService.getDisplayInput()
    return successResponse({ currentInput })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { target } = body as { target: 'hdmi' | 'displayport' }

    if (!target || !['hdmi', 'displayport'].includes(target)) {
      return errorResponse('Invalid target. Must be "hdmi" or "displayport"', 400)
    }

    if (!desktopService.isAvailable()) {
      return errorResponse('Desktop features not available (requires Windows server)', 400)
    }

    if (target === 'hdmi') {
      await desktopService.switchToHdmi()
      return successResponse({ success: true, target: 'hdmi' })
    } else {
      await desktopService.switchToDisplayPort()
      return successResponse({ success: true, target: 'displayport' })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
