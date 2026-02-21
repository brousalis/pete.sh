import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'
import type { CreateVersionRequest } from '@/lib/types/routine-editor.types'

console.log('[versions/route.ts] Module loaded')

/**
 * GET /api/fitness/routine/versions
 * List all versions for a routine
 */
export async function GET(request: NextRequest) {
  console.log('[versions GET] Handler called')
  try {
    const { searchParams } = new URL(request.url)
    const routineId = searchParams.get('routineId') ?? 'climber-physique'

    console.log('[versions GET] Calling getVersions for', routineId)
    const adapter = getFitnessAdapter()
    const versions = await adapter.getVersions(routineId)
    console.log('[versions GET] Got versions:', versions.versions.length)

    return successResponse(versions)
  } catch (error) {
    console.error('[versions GET] Error:', error)
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
