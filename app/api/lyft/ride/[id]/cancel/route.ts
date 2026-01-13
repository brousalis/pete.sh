import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { LyftService } from "@/lib/services/lyft.service"

const lyftService = new LyftService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!lyftService.isConfigured()) {
      return errorResponse("Lyft API not configured", 400)
    }

    const { id } = await params
    const result = await lyftService.cancelRide(id)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
