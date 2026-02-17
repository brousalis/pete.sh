/**
 * Concert Spotify Data API
 * GET /api/concerts/[id]/spotify - Get Spotify listening data for a concert's artist
 */

import { NextRequest } from 'next/server'
import { ConcertsService } from '@/lib/services/concerts.service'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/utils'

const service = new ConcertsService()

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const concert = await service.getConcert(id)
    if (!concert) {
      return errorResponse('Concert not found', 404)
    }

    const spotifyData = await service.getSpotifyData(
      concert.artist_name,
      concert.spotify_artist_id,
      concert.event_date
    )

    return successResponse(spotifyData)
  } catch (error) {
    return handleApiError(error)
  }
}
