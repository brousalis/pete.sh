import { NextResponse } from "next/server"
import { successResponse, handleApiError } from "@/lib/api/utils"
import { getSpotifyAdapter } from "@/lib/adapters"
import { isProductionMode, isLocalMode } from "@/lib/utils/mode"

/**
 * Get current playback state
 */
export async function GET() {
  try {
    const adapter = getSpotifyAdapter()
    
    // In production mode (no local services), read from cache
    if (isProductionMode()) {
      const nowPlaying = await adapter.getNowPlaying()
      return successResponse({
        playback: nowPlaying,
        source: 'cache',
        authenticated: false,
        authAvailable: false,
      })
    }

    // Local mode - try to authenticate
    if (!adapter.isConfigured()) {
      // Not configured - return cached data if available
      try {
        const cachedPlayback = await adapter.getNowPlaying()
        return successResponse({
          playback: cachedPlayback,
          source: 'cache',
          authenticated: false,
          authAvailable: false,
          message: 'Spotify not configured',
        })
      } catch {
        return successResponse({
          playback: { isPlaying: false, track: null, progressMs: 0, durationMs: 0 },
          source: 'none',
          authenticated: false,
          authAvailable: false,
          message: 'Spotify not configured',
        })
      }
    }

    const { authenticated } = await adapter.initializeWithTokens()
    
    if (!authenticated) {
      // Not authenticated in local mode - return cached data with auth prompt
      try {
        const cachedPlayback = await adapter.getNowPlaying()
        return NextResponse.json({
          success: true,
          data: {
            playback: cachedPlayback,
            source: 'cache',
            authenticated: false,
            authAvailable: isLocalMode(),
            authUrl: '/api/spotify/auth',
            message: 'Using cached data. Authenticate to get real-time updates.',
          },
        })
      } catch {
        return NextResponse.json({
          success: true,
          data: {
            playback: { isPlaying: false, track: null, progressMs: 0, durationMs: 0 },
            source: 'none',
            authenticated: false,
            authAvailable: isLocalMode(),
            authUrl: '/api/spotify/auth',
            message: 'Please authenticate to access Spotify.',
          },
        })
      }
    }

    // Authenticated - get live data
    const playbackState = await adapter.getPlaybackState()
    
    // Transform to consistent format
    const nowPlaying = {
      isPlaying: playbackState?.is_playing ?? false,
      track: playbackState?.item ? {
        name: playbackState.item.name,
        artist: playbackState.item.artists.map(a => a.name).join(', '),
        album: playbackState.item.album.name,
        imageUrl: playbackState.item.album.images[0]?.url ?? '',
      } : null,
      progressMs: playbackState?.progress_ms ?? 0,
      durationMs: playbackState?.item?.duration_ms ?? 0,
    }
    
    return successResponse({
      playback: nowPlaying,
      source: 'live',
      authenticated: true,
      authAvailable: true,
    })
  } catch (error) {
    console.error("[Spotify Player] Error:", error)
    return handleApiError(error)
  }
}
