import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { CTAService } from "@/lib/services/cta.service"
import { config } from "@/lib/config"

const ctaService = new CTAService()

export async function GET(request: NextRequest) {
  try {
    if (!config.cta.isTrainConfigured) {
      return errorResponse("CTA Train API key not configured. Please set CTA_TRAIN_API_KEY", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const stationId = searchParams.get("stationId")

    if (!stationId) {
      return errorResponse("stationId query parameter is required", 400)
    }

    const predictions = await ctaService.getTrainPredictions("Brn", stationId)
    return successResponse(predictions)
  } catch (error) {
    return handleApiError(error)
  }
}
