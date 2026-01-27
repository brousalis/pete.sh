import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { getCTAAdapter } from "@/lib/adapters"
import type { CTARouteConfig } from "@/lib/types/cta.types"

export async function GET(request: NextRequest) {
  try {
    const adapter = getCTAAdapter()
    
    // Check if at least one API key is configured
    const { config } = await import("@/lib/config")
    if (!config.cta.isConfigured && !config.cta.isTrainConfigured) {
      return errorResponse("CTA API keys not configured. Please set CTA_API_KEY and/or CTA_TRAIN_API_KEY", 400)
    }

    // Default route configuration - can be customized via query params or config
    const searchParams = request.nextUrl.searchParams
    const routeConfig: CTARouteConfig = {
      bus: [
        // Route 76 - Eastbound, stop: Diversey & Orchard (stop ID: 11031)
        {
          route: "76",
          stopId: searchParams.get("76_stop") || "11031",
          direction: "Eastbound",
        },
        // Route 22 - Southbound, stop: Clark & Diversey (stop ID: 18173)
        {
          route: "22",
          stopId: searchParams.get("22_stop") || "18173",
          direction: "Southbound",
        },
        // Route 36 - Southbound, stop: Clark & Diversey (stop ID: 18173)
        {
          route: "36",
          stopId: searchParams.get("36_stop") || "18173",
          direction: "Southbound",
        },
      ],
      train: [
        // Brown Line - Diversey station southbound platform (stpid: 40530)
        {
          line: "Brn",
          stationId: searchParams.get("brown_station") || "40530",
          direction: "Southbound",
        },
        // Purple Line - Diversey station southbound platform (stpid: 40530)
        {
          line: "P",
          stationId: searchParams.get("purple_station") || "40530",
          direction: "Southbound",
        },
      ],
    }

    // CTA adapter always tries real API first, then falls back to cache
    const results = await adapter.getAllRoutes(routeConfig)
    return successResponse(results)
  } catch (error) {
    return handleApiError(error)
  }
}
