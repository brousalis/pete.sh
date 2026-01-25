import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const adapter = getFitnessAdapter()
    const { day: dayParam } = await params
    const day = dayParam.toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    const workout = await adapter.getWorkoutForDay(day)
    
    if (!workout) {
      return successResponse(null)
    }
    
    return successResponse(workout)
  } catch (error) {
    return handleApiError(error)
  }
}
