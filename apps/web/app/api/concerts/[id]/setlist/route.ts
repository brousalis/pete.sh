/**
 * Concert Setlist API
 * POST /api/concerts/[id]/setlist - Fetch and store setlist from setlist.fm
 */

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { ConcertsService } from '@/lib/services/concerts.service'
import { SetlistFMService } from '@/lib/services/setlistfm.service'
import { NextRequest } from 'next/server'

const concertsService = new ConcertsService()
const setlistService = new SetlistFMService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!setlistService.isConfigured()) {
      return errorResponse('setlist.fm API key not configured', 400)
    }

    const concert = await concertsService.getConcert(id)
    if (!concert) {
      return errorResponse('Concert not found', 404)
    }

    // If we already have a cached setlist, optionally allow re-fetching
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (concert.setlist_data && !force) {
      return successResponse({
        setlist: concert.setlist_data,
        source: 'cache',
      })
    }

    let setlists
    let mbid = concert.musicbrainz_id

    // Step 1: Resolve MusicBrainz ID if not stored
    if (!mbid) {
      const result = await setlistService.searchSetlistsByName(
        concert.artist_name,
        concert.event_date
      )
      setlists = result.setlists
      mbid = result.mbid

      // Store the resolved mbid
      if (mbid) {
        await concertsService.updateConcert(id, { musicbrainz_id: mbid })
      }
    } else {
      // Step 2: Search by known mbid + date
      setlists = await setlistService.searchSetlists(mbid, concert.event_date)
    }

    if (!setlists || setlists.length === 0) {
      return successResponse({
        setlist: null,
        source: 'not_found',
        message: 'No setlist found on setlist.fm for this concert',
      })
    }

    // Use the first (best) match
    const rawSetlist = setlists[0]!
    const normalizedSetlist = setlistService.normalizeSetlist(rawSetlist)

    // Store the setlist data on the concert
    await concertsService.updateConcert(id, {
      setlist_fm_id: rawSetlist.id,
      setlist_data: normalizedSetlist,
      tour_name: concert.tour_name || rawSetlist.tour?.name || undefined,
    })

    return successResponse({
      setlist: normalizedSetlist,
      source: 'setlist.fm',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
