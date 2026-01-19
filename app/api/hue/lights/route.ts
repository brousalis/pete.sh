import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { HueService } from '@/lib/services/hue.service'
import { NextRequest } from 'next/server'

const hueService = new HueService()

export async function GET(_request: NextRequest) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse('HUE bridge not configured', 400)
    }

    const lights = await hueService.getLights()
    return successResponse(lights)
  } catch (error) {
    return handleApiError(error)
  }
}
