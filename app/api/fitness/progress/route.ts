import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getFitnessAdapter } from "@/lib/adapters/fitness.adapter"

export async function GET(request: NextRequest) {
  try {
    const adapter = getFitnessAdapter()
    const searchParams = request.nextUrl.searchParams
    const weekNumber = searchParams.get("week")
      ? parseInt(searchParams.get("week")!)
      : undefined

    const progress = await adapter.getWeeklyProgress(weekNumber || 1)
    return successResponse(progress)
  } catch (error) {
    return handleApiError(error)
  }
}
