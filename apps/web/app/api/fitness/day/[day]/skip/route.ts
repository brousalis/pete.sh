import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"
import { errorResponse, handleApiError, successResponse } from "@/lib/api/utils"
import type { DayOfWeek } from "@/lib/types/fitness.types"
import { NextRequest } from "next/server"

/**
 * POST /api/fitness/day/[day]/skip
 * Skip all activities (workout + morning + night routines) for a day
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
      return errorResponse("Reason is required to skip a day", 400)
    }

    const day = dayParam.toLowerCase() as DayOfWeek
    const targetWeek = weekNumber ?? adapter.getCurrentWeekNumber()

    await adapter.skipDay(day, targetWeek, reason.trim())

    return successResponse({ success: true, skipped: true })
  } catch (error) {
    return handleApiError(error)
  }
}
