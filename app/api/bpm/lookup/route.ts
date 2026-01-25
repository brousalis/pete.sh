import { NextRequest } from "next/server"
import { getSongBpmService } from "@/lib/services/getsongbpm.service"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Lookup BPM for a specific song by title and artist
 * Query params:
 *   - title: song title (required)
 *   - artist: artist name (required for accurate lookup)
 */
export async function GET(request: NextRequest) {
  try {
    if (!getSongBpmService.isConfigured()) {
      return errorResponse("GetSongBPM API not configured. Add GETSONGBPM_API_KEY to your environment.", 400)
    }

    const searchParams = request.nextUrl.searchParams
    const title = searchParams.get("title")
    const artist = searchParams.get("artist")

    if (!title) {
      return errorResponse("Missing required parameter: title", 400)
    }

    // Search for the song with artist for better accuracy
    const results = await getSongBpmService.searchSong(title, artist || undefined, 5)

    // Return the first match or null if not found
    if (results.length > 0) {
      // Try to find an exact or close match
      const exactMatch = results.find(r => 
        r.title.toLowerCase() === title.toLowerCase() &&
        (!artist || r.artist.name.toLowerCase().includes(artist.toLowerCase()))
      )
      return successResponse(exactMatch || results[0])
    }

    return successResponse(null)
  } catch (error) {
    console.error("[GetSongBPM Lookup] Error:", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to lookup song BPM", 500)
  }
}
