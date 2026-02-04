import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"
import { handleApiError, successResponse } from "@/lib/api/utils"
import { NextRequest } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const adapter = getFitnessAdapter()
    const { day: dayParam } = await params
    const searchParams = request.nextUrl.searchParams
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined
    const body = await request.json().catch(() => ({}))
    const exercisesCompleted = body.exercisesCompleted || []

    const day = dayParam.toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

    if (!weekNumber) {
      // Get current week
      const currentWeek = adapter.getCurrentWeekNumber()
      await adapter.markWorkoutComplete(day, currentWeek, exercisesCompleted)
    } else {
      await adapter.markWorkoutComplete(day, weekNumber, exercisesCompleted)
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const adapter = getFitnessAdapter()
    const { day: dayParam } = await params
    const searchParams = request.nextUrl.searchParams
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined

    const day = dayParam.toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

    if (!weekNumber) {
      const currentWeek = adapter.getCurrentWeekNumber()
      await adapter.markWorkoutUncomplete(day, currentWeek)
    } else {
      await adapter.markWorkoutUncomplete(day, weekNumber)
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
