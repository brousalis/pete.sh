import { NextRequest } from "next/server"
import { getSongBpmService } from "@/lib/services/getsongbpm.service"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Search for songs on GetSongBPM and get their BPM
 * Query params:
 *   - q: search query (song title)
 *   - artist: optional artist name for more accurate results
 *   - limit: number of results (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    if (!getSongBpmService.isConfigured()) {
      return errorResponse("GetSongBPM API not configured. Add GETSONGBPM_API_KEY to your environment.", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const artist = searchParams.get("artist") || undefined
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    if (!query) {
      return errorResponse("Missing required parameter: q (search query)", 400)
    }

    const results = await getSongBpmService.searchSong(query, artist, limit)
    return successResponse(results)
  } catch (error) {
    console.error("[GetSongBPM Search] Error:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to search songs", 500)
  }
}
