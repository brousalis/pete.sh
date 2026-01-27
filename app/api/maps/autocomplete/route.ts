import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { MapsService } from "@/lib/services/maps.service"
import { config } from "@/lib/config"

const mapsService = new MapsService()

/**
 * Get place autocomplete predictions
 * GET /api/maps/autocomplete?input=chicago+pizza
 */
export async function GET(request: NextRequest) {
  try {
    if (!mapsService.isConfigured()) {
      return errorResponse("Google Maps API key not configured", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const input = searchParams.get("input")

    if (!input) {
      return errorResponse("input parameter is required", 400)
    }

    // Use home location as bias for better local results
    const locationBias = {
      lat: config.weather.latitude,
      lng: config.weather.longitude,
    }

    const predictions = await mapsService.getAutocomplete(input, locationBias)
    return successResponse(predictions)
  } catch (error) {
    console.error("[Maps Autocomplete Route] Error:", error)
    return handleApiError(error)
  }
}
