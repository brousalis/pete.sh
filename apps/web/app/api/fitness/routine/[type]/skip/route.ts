import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"
import { errorResponse, handleApiError, successResponse } from "@/lib/api/utils"
import type { DayOfWeek } from "@/lib/types/fitness.types"
import { NextRequest } from "next/server"

/**
 * POST /api/fitness/routine/[type]/skip
 * Skip a routine (morning or night) with a reason
 * Query params: day (required), week (optional - defaults to current week)
 * Body: { reason: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  try {
    const adapter = getFitnessAdapter()
    const searchParams = request.nextUrl.searchParams
    const day = searchParams.get("day") as DayOfWeek
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined
    const body = await request.json().catch(() => ({}))
    const reason = body.reason

    if (!day) {
      return errorResponse("Day parameter is required", 400)
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return errorResponse("Reason is required to skip a routine", 400)
    }

    const routineType = type === "morning" ? "morning" : "night"
    const week = weekNumber ?? adapter.getCurrentWeekNumber()

    await adapter.skipRoutine(routineType, day, week, reason.trim())

    return successResponse({ success: true, skipped: true })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/fitness/routine/[type]/skip
 * Unskip a routine (remove skip status)
 * Query params: day (required), week (optional - defaults to current week)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  try {
    const adapter = getFitnessAdapter()
    const searchParams = request.nextUrl.searchParams
    const day = searchParams.get("day") as DayOfWeek
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined

    if (!day) {
      return errorResponse("Day parameter is required", 400)
    }

    const routineType = type === "morning" ? "morning" : "night"
    const week = weekNumber ?? adapter.getCurrentWeekNumber()

    await adapter.unskipRoutine(routineType, day, week)

    return successResponse({ success: true, skipped: false })
  } catch (error) {
    return handleApiError(error)
  }
}
