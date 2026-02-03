import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getHueAdapter } from '@/lib/adapters'
import { isProductionMode } from '@/lib/utils/mode'

export async function GET() {
  try {
    const adapter = getHueAdapter()
    
    if (!isProductionMode() && !adapter.isConfigured()) {
      return errorResponse('HUE bridge not configured', 400)
    }

    const lights = await adapter.getLights()
    return successResponse(lights)
  } catch (error) {
    return handleApiError(error)
  }
}
