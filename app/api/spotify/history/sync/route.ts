/**
 * Spotify History Sync API
 * POST - Sync recent plays from Spotify to Supabase
 * 
 * This endpoint fetches the user's recent plays from Spotify and stores them
 * in Supabase for persistent history tracking.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSpotifyService } from "@/lib/spotify-auth"
import { getSpotifyHistoryService } from "@/lib/services/spotify-history.service"
import { CORS_HEADERS, corsOptionsResponse } from "@/lib/api/cors"
import { hasServiceRoleKey } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  // Check if we have Supabase service role key for writes
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        success: false,
        message: "History sync requires Supabase service role key",
      },
      { status: 403, headers: CORS_HEADERS }
    )
  }

  const historyService = getSpotifyHistoryService()

  if (!historyService.isConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "History service not configured (Supabase required)",
      },
      { status: 503, headers: CORS_HEADERS }
    )
  }

  try {
    // Get authenticated Spotify service
    const { service: spotifyService, authenticated } = await getAuthenticatedSpotifyService()

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Spotify not authenticated",
          authUrl: spotifyService.isConfigured() ? "/api/spotify/auth" : null,
        },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Set the authenticated service on the history service
    historyService.setSpotifyService(spotifyService)

    // Sync recent plays
    const result = await historyService.syncRecentPlays()

    return NextResponse.json(
      {
        ...result,
        syncedAt: new Date().toISOString(),
      },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[API] History sync error:", error)
    return NextResponse.json(
      {
        success: false,
        newTracks: 0,
        totalTracksInDb: 0,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// Also support GET for manual sync via browser
export async function GET(request: NextRequest) {
  return POST(request)
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse()
}
