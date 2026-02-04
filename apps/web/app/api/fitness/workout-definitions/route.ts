import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'

/**
 * GET /api/fitness/workout-definitions
 * Get all workout definitions for a routine
 * Returns definitions with version info from active version
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routineId = searchParams.get('routineId') ?? 'climber-physique'

    const adapter = getFitnessAdapter()
    const definitions = await adapter.getWorkoutDefinitions(routineId)

    // Get version info from active version
    const versions = await adapter.getVersions(routineId)
    const activeVersion = versions.activeVersion

    return successResponse({
      definitions,
      version: activeVersion ? {
        number: activeVersion.versionNumber,
        name: activeVersion.name,
        activatedAt: activeVersion.activatedAt,
      } : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/fitness/workout-definitions
 * Bulk update workout definitions (typically when saving a version)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { routineId = 'climber-physique', definitions } = body

    const adapter = getFitnessAdapter()
    const updated = await adapter.updateWorkoutDefinitions(routineId, definitions)

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
