import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { LyftService } from '@/lib/services/lyft.service'
import { NextRequest } from 'next/server'

const lyftService = new LyftService()

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!lyftService.isConfigured()) {
      return errorResponse('Lyft API not configured', 400)
    }

    const { id } = await params
    const ride = await lyftService.getRideStatus(id)
    return successResponse(ride)
  } catch (error) {
    return handleApiError(error)
  }
}
