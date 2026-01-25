import { handleApiError, successResponse } from '@/lib/api/utils'
import { getSonosAdapter } from '@/lib/adapters'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adapter = getSonosAdapter()
    const { id } = await params
    const state = await adapter.getPlayerState(id)
    return successResponse(state)
  } catch (error) {
    return handleApiError(error)
  }
}
