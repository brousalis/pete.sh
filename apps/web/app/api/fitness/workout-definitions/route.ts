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

    // Parallelize the three independent reads so total latency is the max of
    // them instead of the sum (previously ~3x the slowest call).
    const [definitions, versions, routine] = await Promise.all([
      adapter.getWorkoutDefinitions(routineId),
      adapter.getVersions(routineId),
      adapter.getRoutine(),
    ])

    const activeVersion = versions.activeVersion
    const trainingTime = routine?.userProfile?.schedule?.trainingTime ?? null

    return successResponse({
      definitions,
      version: activeVersion ? {
        number: activeVersion.versionNumber,
        name: activeVersion.name,
        activatedAt: activeVersion.activatedAt,
      } : null,
      trainingTime,
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
