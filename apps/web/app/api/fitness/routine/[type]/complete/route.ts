import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  try {
    const adapter = getFitnessAdapter()
    const searchParams = request.nextUrl.searchParams
    const day = searchParams.get("day") as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined

    if (!day) {
      throw new Error("Day parameter is required")
    }

    const routineType = type === "morning" ? "morning" : "night"
    const week = weekNumber || adapter.getCurrentWeekNumber()
    
    await adapter.markRoutineComplete(routineType, day, week)

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
    const adapter = getFitnessAdapter()
    const searchParams = request.nextUrl.searchParams
    const day = searchParams.get("day") as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined

    if (!day) {
      throw new Error("Day parameter is required")
    }

    const routineType = type === "morning" ? "morning" : "night"
    const week = weekNumber || adapter.getCurrentWeekNumber()
    
    await adapter.markRoutineIncomplete(routineType, day, week)

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
