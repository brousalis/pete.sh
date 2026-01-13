import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { CTAService } from "@/lib/services/cta.service"

const ctaService = new CTAService()

export async function GET(request: NextRequest) {
  try {
    if (!ctaService.isConfigured()) {
      return errorResponse("CTA API key not configured", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const route = searchParams.get("route")
    const direction = searchParams.get("direction")
    const stopName = searchParams.get("stopName")

    if (!route || !direction) {
      return errorResponse("route and direction query parameters are required", 400)
    }

    if (stopName) {
      // Search for specific stop by name
      const stopId = await ctaService.findStopId(route, direction, stopName)
      if (!stopId) {
        return errorResponse(`Stop '${stopName}' not found for route ${route} ${direction}`, 404)
      }
      return successResponse({ stopId, route, direction, stopName })
    }

    // Return all stops for the route and direction
    const stops = await ctaService.getStops(route, direction)
    return successResponse(stops)
  } catch (error) {
    return handleApiError(error)
  }
}
