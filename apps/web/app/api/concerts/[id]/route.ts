/**
 * Concert Detail API - Get, Update, Delete
 * GET /api/concerts/[id] - Get a single concert
 * PUT /api/concerts/[id] - Update a concert
 * DELETE /api/concerts/[id] - Delete a concert
 */

import { NextRequest } from 'next/server'
import { ConcertsService } from '@/lib/services/concerts.service'
import { successResponse, errorResponse, handleApiError, getJsonBody } from '@/lib/api/utils'
import type { ConcertUpdateRequest } from '@/lib/types/concerts.types'

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

    return successResponse(concert)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await getJsonBody<ConcertUpdateRequest>(request)
    const concert = await service.updateConcert(id, body)
    return successResponse(concert)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await service.deleteConcert(id)
    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
