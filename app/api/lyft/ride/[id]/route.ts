import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { LyftService } from "@/lib/services/lyft.service"

const lyftService = new LyftService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!lyftService.isConfigured()) {
      return errorResponse("Lyft API not configured", 400)
    }

    const { id } = await params
    const ride = await lyftService.getRideStatus(id)
    return successResponse(ride)
  } catch (error) {
    return handleApiError(error)
  }
}
