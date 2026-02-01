/**
 * Spotify Listening Stats API
 * GET - Fetch listening statistics for a time period
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
          stats: null,
          syncInfo: null,
        },
        message: "History service not configured (Supabase required)",
      },
      { status: 200, headers: CORS_HEADERS }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30", 10)

    const stats = await historyService.getStats(Math.min(days, 365)) // Cap at 1 year
    const cursor = await historyService.getSyncCursor()

    return NextResponse.json(
      {
        success: true,
        data: {
          stats,
          syncInfo: {
            lastSyncAt: cursor.last_sync_at,
            totalTracksSynced: cursor.total_tracks_synced,
          },
          period: {
            days,
            startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          },
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[API] Stats fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse()
}
