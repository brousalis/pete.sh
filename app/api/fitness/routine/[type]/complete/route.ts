import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { FitnessService } from "@/lib/services/fitness.service"

const fitnessService = new FitnessService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  try {
    const searchParams = request.nextUrl.searchParams
    const day = searchParams.get("day") as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined

    if (!day) {
      throw new Error("Day parameter is required")
    }

    const routineType = type === "morning" ? "morning" : "night"
    
    if (!weekNumber) {
      // Get current week
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      await fitnessService.markRoutineComplete(routineType, day, currentWeek)
    } else {
      await fitnessService.markRoutineComplete(routineType, day, weekNumber)
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
