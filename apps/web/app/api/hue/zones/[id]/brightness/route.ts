import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { getHueAdapter } from "@/lib/adapters"
import { localModeGuard, ensureLocalAvailabilityChecked } from "@/lib/utils/mode"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureLocalAvailabilityChecked()
    const guard = localModeGuard()
    if (!guard.allowed) {
      return errorResponse(guard.error ?? "Controls disabled in production mode", 403)
    }

    const adapter = getHueAdapter()
    
    if (!adapter.isConfigured()) {
      return errorResponse("HUE bridge not configured", 400)
    }

    const { id } = await params
    const body = await request.json()
    const { brightness } = body

    if (typeof brightness !== "number" || brightness < 1 || brightness > 254) {
      return errorResponse("Brightness must be a number between 1 and 254", 400)
    }

    const result = await adapter.setZoneBrightness(id, brightness)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
