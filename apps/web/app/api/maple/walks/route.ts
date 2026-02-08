/**
 * Maple Walks API
 * GET - List all walks
 * POST - Create a new walk
 */

import { mapleService } from '@/lib/services/maple.service'
import type { CreateMapleWalkInput, ListMapleWalksOptions, MapleMoodRating } from '@/lib/types/maple.types'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/maple/walks
 * List maple walks with optional filtering
 * Query params:
 *   - limit: Number of results (default 50)
 *   - offset: Pagination offset (default 0)
 *   - startDate: Filter by start date (YYYY-MM-DD)
 *   - endDate: Filter by end date (YYYY-MM-DD)
 *   - moodRating: Filter by mood (happy, neutral, sad)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const options: ListMapleWalksOptions = {
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      moodRating: (searchParams.get('moodRating') as MapleMoodRating) || undefined,
    }

    const walks = await mapleService.getWalks(options)

    return NextResponse.json({
      success: true,
      data: walks,
    })
  } catch (error) {
    console.error('Error fetching maple walks:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/maple/walks
 * Create a new maple walk
 * Body:
 *   - healthkitWorkoutId: UUID of the linked workout (required)
 *   - title: Optional title for the walk
 *   - moodRating: happy, neutral, or sad
 *   - notes: Optional notes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.healthkitWorkoutId) {
      return NextResponse.json(
        { success: false, error: 'healthkitWorkoutId is required' },
        { status: 400 }
      )
    }

    // Validate mood rating if provided
    if (body.moodRating && !['happy', 'neutral', 'sad'].includes(body.moodRating)) {
      return NextResponse.json(
        { success: false, error: 'moodRating must be happy, neutral, or sad' },
        { status: 400 }
      )
    }

    const input: CreateMapleWalkInput = {
      healthkitWorkoutId: body.healthkitWorkoutId,
      title: body.title,
      moodRating: body.moodRating,
      notes: body.notes,
    }

    const walk = await mapleService.createWalk(input)

    if (!walk) {
      return NextResponse.json(
        { success: false, error: 'Failed to create walk. Workout may not exist or already be linked.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: walk,
    })
  } catch (error) {
    console.error('Error creating maple walk:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
