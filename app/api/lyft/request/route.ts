import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { LyftService } from "@/lib/services/lyft.service"

const lyftService = new LyftService()

export async function POST(request: NextRequest) {
  try {
    if (!lyftService.isConfigured()) {
      return errorResponse("Lyft API not configured", 400)
    }

    const body = await request.json()
    const ride = await lyftService.requestRide(body)
    return successResponse(ride)
  } catch (error) {
    return handleApiError(error)
  }
}
