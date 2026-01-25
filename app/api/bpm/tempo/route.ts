import { NextRequest } from "next/server"
import { getSongBpmService } from "@/lib/services/getsongbpm.service"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Find songs within a BPM range
 * Query params:
 *   - min: minimum BPM (default: 165)
 *   - max: maximum BPM (default: 175)
 *   - limit: number of results (default 50, max ~250)
 */
export async function GET(request: NextRequest) {
  try {
    if (!getSongBpmService.isConfigured()) {
      return errorResponse("GetSongBPM API not configured. Add GETSONGBPM_API_KEY to your environment.", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const minBpm = parseInt(searchParams.get("min") || "165", 10)
    const maxBpm = parseInt(searchParams.get("max") || "175", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    // Validate BPM range
    if (minBpm < 40 || maxBpm > 220) {
      return errorResponse("BPM must be between 40 and 220", 400)
    }

    if (minBpm > maxBpm) {
      return errorResponse("min BPM cannot be greater than max BPM", 400)
    }

    const results = await getSongBpmService.findByTempoRange(minBpm, maxBpm, limit)
    return successResponse(results)
  } catch (error) {
    console.error("[GetSongBPM Tempo] Error:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to find songs by tempo", 500)
  }
}
