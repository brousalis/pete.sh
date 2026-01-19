import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { FitnessService } from "@/lib/services/fitness.service"

const fitnessService = new FitnessService()

function getCurrentWeekNumber(): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

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
    const week = weekNumber || getCurrentWeekNumber()
    
    await fitnessService.markRoutineComplete(routineType, day, week)

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
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
    const week = weekNumber || getCurrentWeekNumber()
    
    await fitnessService.markRoutineIncomplete(routineType, day, week)

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
