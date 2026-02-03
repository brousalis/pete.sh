import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/fitness/routine/versions/[id]/activate
 * Activate a version, making it the current active version
 * This deactivates any previously active version
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const adapter = getFitnessAdapter()

    const version = await adapter.activateVersion(id)
    if (!version) {
      return successResponse({ error: 'Version not found' }, 404)
    }

    return successResponse(version)
  } catch (error) {
    return handleApiError(error)
  }
}
