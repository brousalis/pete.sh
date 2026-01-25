import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"

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
