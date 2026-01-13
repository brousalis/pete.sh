import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { FitnessService } from "@/lib/services/fitness.service"

const fitnessService = new FitnessService()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const weekNumber = searchParams.get("week")
      ? parseInt(searchParams.get("week")!)
      : undefined

    const progress = await fitnessService.getWeeklyProgress(weekNumber || 1)
    return successResponse(progress)
  } catch (error) {
    return handleApiError(error)
  }
}
