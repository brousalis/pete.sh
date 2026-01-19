import { handleApiError, successResponse } from '@/lib/api/utils'
import { SonosService } from '@/lib/services/sonos.service'
import { NextRequest } from 'next/server'

const sonosService = new SonosService()

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const state = await sonosService.getPlayerState(id)
    return successResponse(state)
  } catch (error) {
    return handleApiError(error)
  }
}
