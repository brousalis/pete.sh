/**
 * Concerts API - List and Create
 * GET /api/concerts - List concerts with optional filters
 * POST /api/concerts - Create a new concert
 */

import { NextRequest } from 'next/server'
import { ConcertsService } from '@/lib/services/concerts.service'
import { successResponse, errorResponse, handleApiError, getJsonBody } from '@/lib/api/utils'
import type { ConcertCreateRequest, ConcertFilters } from '@/lib/types/concerts.types'

const service = new ConcertsService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: ConcertFilters = {
      status: (searchParams.get('status') as ConcertFilters['status']) || undefined,
      year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
      artist: searchParams.get('artist') || undefined,
      venue: searchParams.get('venue') || undefined,
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : 0,
      sort: (searchParams.get('sort') as ConcertFilters['sort']) || 'date_desc',
    }

    const result = await service.getConcerts(filters)
    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await getJsonBody<ConcertCreateRequest>(request)

    if (!body.artist_name || !body.venue_name || !body.event_date) {
      return errorResponse('artist_name, venue_name, and event_date are required', 400)
    }

    const concert = await service.createConcert(body)
    return successResponse(concert, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
