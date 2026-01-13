import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { MapsService } from "@/lib/services/maps.service"

const mapsService = new MapsService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!mapsService.isConfigured()) {
      return errorResponse("Google Maps API key not configured", 400)
    }

    const { id } = await params
    const details = await mapsService.getPlaceDetails(id)
    return successResponse(details)
  } catch (error) {
    return handleApiError(error)
  }
}
