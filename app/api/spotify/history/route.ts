/**
 * Spotify Listening History API
 * GET - Fetch listening history from Supabase
 */

import { NextRequest, NextResponse } from "next/server"
import { getSpotifyHistoryService } from "@/lib/services/spotify-history.service"
import { CORS_HEADERS, corsOptionsResponse } from "@/lib/api/cors"

export async function GET(request: NextRequest) {
  const historyService = getSpotifyHistoryService()

  if (!historyService.isConfigured()) {
    return NextResponse.json(
      {
        success: true,
        data: {
          history: [],
          count: 0,
        },
        message: "History service not configured (Supabase required)",
      },
      { status: 200, headers: CORS_HEADERS }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const history = await historyService.getHistory({
      limit: Math.min(limit, 100), // Cap at 100
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          history,
          count: history.length,
          offset,
          limit,
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[API] History fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch history",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse()
}
