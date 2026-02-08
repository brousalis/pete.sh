/**
 * Maple Walk Detail API
 * GET - Get a single walk with full details
 * PUT - Update a walk
 * DELETE - Delete a walk
 */

import { mapleService } from '@/lib/services/maple.service'
import type { UpdateMapleWalkInput } from '@/lib/types/maple.types'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/maple/walks/[id]
 * Get a single walk with full details (workout data, route, HR samples)
 * Query params:
 *   - full: If 'true', include workout, route, and HR samples (default true)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeFull = searchParams.get('full') !== 'false'

    if (includeFull) {
      const walk = await mapleService.getWalkWithDetails(id)

      if (!walk) {
        return NextResponse.json(
          { success: false, error: 'Walk not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: walk,
      })
    } else {
      const walk = await mapleService.getWalk(id)

      if (!walk) {
        return NextResponse.json(
          { success: false, error: 'Walk not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: walk,
      })
    }
  } catch (error) {
    console.error('Error fetching maple walk:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/maple/walks/[id]
 * Update a walk's metadata
 * Body:
 *   - title: Optional new title (null to clear)
 *   - moodRating: happy, neutral, sad, or null
 *   - notes: Optional new notes (null to clear)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate mood rating if provided
    if (body.moodRating !== undefined && body.moodRating !== null && !['happy', 'neutral', 'sad'].includes(body.moodRating)) {
      return NextResponse.json(
        { success: false, error: 'moodRating must be happy, neutral, sad, or null' },
        { status: 400 }
      )
    }

    const input: UpdateMapleWalkInput = {}

    if ('title' in body) input.title = body.title
    if ('moodRating' in body) input.moodRating = body.moodRating
    if ('notes' in body) input.notes = body.notes

    const walk = await mapleService.updateWalk(id, input)

    if (!walk) {
      return NextResponse.json(
        { success: false, error: 'Walk not found or update failed' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: walk,
    })
  } catch (error) {
    console.error('Error updating maple walk:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/maple/walks/[id]
 * Delete a walk (does not delete the underlying workout)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const success = await mapleService.deleteWalk(id)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Walk not found or delete failed' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error deleting maple walk:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
