import { NextRequest } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { FitnessService } from "@/lib/services/fitness.service"

const fitnessService = new FitnessService()

export async function GET(request: NextRequest) {
  try {
    let routine = await fitnessService.getRoutine()
    if (!routine) {
      throw new Error("No routine found")
    }
    return successResponse(routine)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const routine = await fitnessService.updateRoutine(body)
    return successResponse(routine)
  } catch (error) {
    return handleApiError(error)
  }
}
