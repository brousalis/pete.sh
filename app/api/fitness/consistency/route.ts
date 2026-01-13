import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { FitnessService } from "@/lib/services/fitness.service"

const fitnessService = new FitnessService()

export async function GET(request: NextRequest) {
  try {
    const stats = await fitnessService.getConsistencyStats()
    return successResponse(stats)
  } catch (error) {
    return handleApiError(error)
  }
}
