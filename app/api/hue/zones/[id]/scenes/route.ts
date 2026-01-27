import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getHueAdapter } from '@/lib/adapters'
import { isProductionMode } from '@/lib/utils/mode'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adapter = getHueAdapter()
    
    if (!isProductionMode() && !adapter.isConfigured()) {
      return errorResponse('HUE bridge not configured', 400)
    }

    const { id } = await params
    const scenes = await adapter.getScenesForZone(id)
    return successResponse(scenes)
  } catch (error) {
    return handleApiError(error)
  }
}
