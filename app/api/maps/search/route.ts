import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { MapsService } from "@/lib/services/maps.service"

const mapsService = new MapsService()

export async function GET(request: NextRequest) {
  try {
    if (!mapsService.isConfigured()) {
      return errorResponse("Google Maps API key not configured", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query")

    if (!query) {
      return errorResponse("query parameter is required", 400)
    }

    const results = await mapsService.searchLocation(query)
    return successResponse(results)
  } catch (error) {
    return handleApiError(error)
  }
}
