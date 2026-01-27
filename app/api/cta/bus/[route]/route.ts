import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { CTAService } from "@/lib/services/cta.service"

const ctaService = new CTAService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string }> }
) {
  try {
    if (!ctaService.isConfigured()) {
      return errorResponse("CTA API key not configured", 400)
    }

    const { route } = await params
    const searchParams = request.nextUrl.searchParams
    const stopId = searchParams.get("stopId")

    if (!stopId) {
      return errorResponse("stopId query parameter is required", 400)
    }

    const predictions = await ctaService.getBusPredictions(route, stopId)
    return successResponse(predictions)
  } catch (error) {
    return handleApiError(error)
  }
}
