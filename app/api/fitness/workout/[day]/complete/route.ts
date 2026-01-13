import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { FitnessService } from "@/lib/services/fitness.service"

const fitnessService = new FitnessService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const { day: dayParam } = await params
    const searchParams = request.nextUrl.searchParams
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined
    const body = await request.json().catch(() => ({}))
    const exercisesCompleted = body.exercisesCompleted || []

    const day = dayParam.toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    
    if (!weekNumber) {
      // Get current week
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      await fitnessService.markWorkoutComplete(day, currentWeek, exercisesCompleted)
    } else {
      await fitnessService.markWorkoutComplete(day, weekNumber, exercisesCompleted)
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
