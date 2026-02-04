import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"
import { errorResponse, handleApiError, successResponse } from "@/lib/api/utils"
import type { DayOfWeek } from "@/lib/types/fitness.types"
import { NextRequest } from "next/server"

/**
 * POST /api/fitness/workout/[day]/skip
 * Skip a workout with a reason
 * Query params: week (optional - defaults to current week)
 * Body: { reason: string }
 */
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
    const reason = body.reason

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return errorResponse("Reason is required to skip a workout", 400)
    }

    const day = dayParam.toLowerCase() as DayOfWeek
    const targetWeek = weekNumber ?? adapter.getCurrentWeekNumber()

    await adapter.skipWorkout(day, targetWeek, reason.trim())

    return successResponse({ success: true, skipped: true })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/fitness/workout/[day]/skip
 * Unskip a workout (remove skip status)
 * Query params: week (optional - defaults to current week)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const adapter = getFitnessAdapter()
    const { day: dayParam } = await params
    const searchParams = request.nextUrl.searchParams
    const weekNumber = searchParams.get("week") ? parseInt(searchParams.get("week")!) : undefined

    const day = dayParam.toLowerCase() as DayOfWeek
    const targetWeek = weekNumber ?? adapter.getCurrentWeekNumber()

    await adapter.unskipWorkout(day, targetWeek)

    return successResponse({ success: true, skipped: false })
  } catch (error) {
    return handleApiError(error)
  }
}
