import { handleApiError, successResponse } from '@/lib/api/utils'
import { SonosService } from '@/lib/services/sonos.service'
import { NextRequest } from 'next/server'

const sonosService = new SonosService()

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await sonosService.pause(id)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
