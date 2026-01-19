import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { HueService } from '@/lib/services/hue.service'
import { NextRequest } from 'next/server'

const hueService = new HueService()

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    if (!hueService.isConfigured()) {
      return errorResponse('HUE bridge not configured', 400)
    }

    const { id, sceneId } = await params
    const result = await hueService.activateScene(id, sceneId)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
