import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'

/**
 * POST /api/fitness/routine/versions/cleanup
 * Clean up duplicate/orphaned versions
 * Keeps: active version + newest draft (if newer than active)
 * Deletes: all other drafts and inactive non-active versions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { routineId = 'climber-physique' } = body
    
    const adapter = getFitnessAdapter()
    const result = await adapter.cleanupVersions(routineId)
    
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
