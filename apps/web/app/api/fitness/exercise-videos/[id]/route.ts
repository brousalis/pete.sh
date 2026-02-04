import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { handleApiError, successResponse } from '@/lib/api/utils'
import type { ExerciseDemoVideoUpdate } from '@/lib/types/fitness.types'
import { NextRequest } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/fitness/exercise-videos/[id]
 * Get a specific exercise demo video by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const adapter = getFitnessAdapter()
    const video = await adapter.getExerciseVideo(id)

    if (!video) {
      return handleApiError(new Error('Video not found'))
    }

    return successResponse(video)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/fitness/exercise-videos/[id]
 * Update an exercise demo video
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json() as ExerciseDemoVideoUpdate

    const adapter = getFitnessAdapter()
    const video = await adapter.updateExerciseVideo(id, body)

    if (!video) {
      return handleApiError(new Error('Video not found or update failed'))
    }

    return successResponse(video)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/fitness/exercise-videos/[id]
 * Delete an exercise demo video
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const adapter = getFitnessAdapter()
    const success = await adapter.deleteExerciseVideo(id)

    if (!success) {
      return handleApiError(new Error('Video not found or delete failed'))
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
