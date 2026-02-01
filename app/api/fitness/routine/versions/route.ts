import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'
import type { CreateVersionRequest } from '@/lib/types/routine-editor.types'

/**
 * GET /api/fitness/routine/versions
 * List all versions for a routine
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routineId = searchParams.get('routineId') ?? 'climber-physique'

    const adapter = getFitnessAdapter()
    const versions = await adapter.getVersions(routineId)

    return successResponse(versions)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/fitness/routine/versions
 * Create a new version (draft)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateVersionRequest = await request.json()
    const adapter = getFitnessAdapter()

    const version = await adapter.createVersion(body)

    return successResponse(version, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
