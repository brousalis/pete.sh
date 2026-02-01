import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'
import type { DayOfWeek, Workout } from '@/lib/types/fitness.types'

interface RouteParams {
  params: Promise<{ day: string }>
}

const validDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/**
 * GET /api/fitness/workout-definitions/[day]
 * Get workout definition for a specific day
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { day } = await params
    const { searchParams } = new URL(request.url)
    const routineId = searchParams.get('routineId') ?? 'climber-physique'

    if (!validDays.includes(day as DayOfWeek)) {
      return successResponse({ error: 'Invalid day' }, 400)
    }

    const adapter = getFitnessAdapter()
    const workout = await adapter.getWorkoutForDay(day as DayOfWeek)

    return successResponse(workout)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/fitness/workout-definitions/[day]
 * Update workout definition for a specific day
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { day } = await params
    const { searchParams } = new URL(request.url)
    const routineId = searchParams.get('routineId') ?? 'climber-physique'

    if (!validDays.includes(day as DayOfWeek)) {
      return successResponse({ error: 'Invalid day' }, 400)
    }

    const workout: Workout = await request.json()
    const adapter = getFitnessAdapter()

    const updated = await adapter.updateWorkoutDefinition(routineId, day as DayOfWeek, workout)

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
