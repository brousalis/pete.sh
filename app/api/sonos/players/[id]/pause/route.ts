import { handleApiError, successResponse, errorResponse } from '@/lib/api/utils'
import { getSonosAdapter } from '@/lib/adapters'
import { localModeGuard } from '@/lib/utils/mode'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only allow in local mode
    const guard = localModeGuard()
    if (!guard.allowed) {
      return errorResponse(guard.error ?? "Controls disabled in production mode", 403)
    }

    const adapter = getSonosAdapter()
    const { id } = await params
    const result = await adapter.pause(id)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
