import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { handleApiError, successResponse } from '@/lib/api/utils'
import type { ExerciseDemoVideoInput } from '@/lib/types/fitness.types'
import { NextRequest } from 'next/server'

/**
 * GET /api/fitness/exercise-videos
 * Get all exercise demo videos, optionally filtered by exercise name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exerciseName = searchParams.get('exerciseName')

    const adapter = getFitnessAdapter()

    if (exerciseName) {
      const videos = await adapter.getExerciseVideosByName(exerciseName)
      return successResponse(videos)
    }

    const videos = await adapter.getAllExerciseVideos()
    return successResponse(videos)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/fitness/exercise-videos
 * Create a new exercise demo video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExerciseDemoVideoInput

    if (!body.exerciseName || !body.videoUrl) {
      return handleApiError(new Error('exerciseName and videoUrl are required'))
    }

    const adapter = getFitnessAdapter()
    const video = await adapter.createExerciseVideo(body)

    return successResponse(video)
  } catch (error) {
    return handleApiError(error)
  }
}
