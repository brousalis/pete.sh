import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"

/**
 * Search Spotify
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSpotifyConfigured()) {
      return errorResponse("Spotify not configured", 400)
    }

    const { service, authenticated } = await getAuthenticatedSpotifyService()
    if (!authenticated) {
      return errorResponse("Not authenticated with Spotify", 401)
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const types = searchParams.get("types")?.split(",") as ("track" | "artist" | "album" | "playlist")[] || ["track"]
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    if (!query) {
      return errorResponse("Query parameter 'q' is required", 400)
    }

    const results = await service.search(query, types, limit)
    return successResponse(results)
  } catch (error) {
    console.error("[Spotify Search] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to search", 500)
  }
}
