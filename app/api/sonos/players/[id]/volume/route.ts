import { NextRequest } from "next/server"
import { successResponse, errorResponse, handleApiError } from "@/lib/api/utils"
import { getSonosAdapter } from "@/lib/adapters"
import { localModeGuard } from "@/lib/utils/mode"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Guard: Only allow in local mode
    const guard = localModeGuard()
    if (!guard.allowed) {
      return errorResponse(guard.error ?? "Controls disabled in production mode", 403)
    }

    const adapter = getSonosAdapter()
    const { id } = await params
    const body = await request.json()
    const { volume } = body

    if (volume === undefined || volume < 0 || volume > 100) {
      return errorResponse("Volume must be between 0 and 100", 400)
    }

    const result = await adapter.setVolume(id, volume)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
