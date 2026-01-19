import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { HueService } from '@/lib/services/hue.service'
import { NextRequest } from 'next/server'

const hueService = new HueService()

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse('HUE bridge not configured', 400)
    }

    const { id } = await params
    const scenes = await hueService.getScenesForZone(id)
    return successResponse(scenes)
  } catch (error) {
    return handleApiError(error)
  }
}
