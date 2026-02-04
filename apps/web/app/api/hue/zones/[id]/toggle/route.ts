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
    const { on } = body

    const result = await adapter.toggleZone(id, on)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
