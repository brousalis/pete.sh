import { NextRequest } from "next/server"
import { getAuthenticatedSpotifyService, isSpotifyConfigured } from "@/lib/spotify-auth"
import { successResponse, errorResponse } from "@/lib/api/utils"
import type { SpotifyRecommendationsParams } from "@/lib/types/spotify.types"

/**
 * Get track recommendations based on seeds and audio features
 * Query params:
 *   - seed_artists: comma-separated artist IDs (max 5 total seeds)
 *   - seed_tracks: comma-separated track IDs
 *   - seed_genres: comma-separated genre names
 *   - limit: number of recommendations (max 100, default 20)
 *   - target_tempo: target BPM
 *   - min_tempo: minimum BPM
 *   - max_tempo: maximum BPM
 *   - target_energy: target energy (0.0-1.0)
 *   - min_energy: minimum energy
 *   - max_energy: maximum energy
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

    // Build params object
    const params: SpotifyRecommendationsParams = {}

    // Parse seed parameters
    const seedArtists = searchParams.get("seed_artists")
    if (seedArtists) {
      params.seed_artists = seedArtists.split(",").filter(Boolean)
    }

    const seedTracks = searchParams.get("seed_tracks")
    if (seedTracks) {
      params.seed_tracks = seedTracks.split(",").filter(Boolean)
    }

    const seedGenres = searchParams.get("seed_genres")
    if (seedGenres) {
      params.seed_genres = seedGenres.split(",").filter(Boolean)
    }

    // Ensure at least one seed is provided
    const totalSeeds = (params.seed_artists?.length || 0) +
                       (params.seed_tracks?.length || 0) +
                       (params.seed_genres?.length || 0)
    if (totalSeeds === 0) {
      return errorResponse("At least one seed (seed_artists, seed_tracks, or seed_genres) is required", 400)
    }

    // Parse limit
    const limit = searchParams.get("limit")
    if (limit) {
      params.limit = parseInt(limit, 10)
    }

    // Parse tempo filters
    const targetTempo = searchParams.get("target_tempo")
    if (targetTempo) {
      params.target_tempo = parseFloat(targetTempo)
    }

    const minTempo = searchParams.get("min_tempo")
    if (minTempo) {
      params.min_tempo = parseFloat(minTempo)
    }

    const maxTempo = searchParams.get("max_tempo")
    if (maxTempo) {
      params.max_tempo = parseFloat(maxTempo)
    }

    // Parse energy filters
    const targetEnergy = searchParams.get("target_energy")
    if (targetEnergy) {
      params.target_energy = parseFloat(targetEnergy)
    }

    const minEnergy = searchParams.get("min_energy")
    if (minEnergy) {
      params.min_energy = parseFloat(minEnergy)
    }

    const maxEnergy = searchParams.get("max_energy")
    if (maxEnergy) {
      params.max_energy = parseFloat(maxEnergy)
    }

    const recommendations = await service.getRecommendations(params)
    return successResponse(recommendations)
  } catch (error) {
    console.error("[Spotify Recommendations] Error:", error)
    if (error instanceof Error && error.message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired", 401)
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to get recommendations", 500)
  }
}
