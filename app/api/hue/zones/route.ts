import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getHueAdapter } from '@/lib/adapters'
import { isProductionMode } from '@/lib/utils/mode'

export async function GET() {
  try {
    const adapter = getHueAdapter()
    
    // In production mode, we always have data from cache
    // In local mode, check if bridge is configured
    if (!isProductionMode() && !adapter.isConfigured()) {
      return errorResponse('HUE bridge not configured', 400)
    }

    const zones = await adapter.getZones()
    return successResponse(zones)
  } catch (error) {
    return handleApiError(error)
  }
}
