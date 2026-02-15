/**
 * Available Workouts API for Maple Walks
 * GET - List workouts (walking + other) not yet linked to maple walks
 * Maple walks should be recorded as 'Other' on Apple Watch to preserve fitness calibration
 */

import { mapleService } from '@/lib/services/maple.service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/maple/walks/available
 * List workouts that haven't been linked to a maple walk yet
 * Includes both 'walking' (legacy) and 'other' (preferred) workout types
 * Query params:
 *   - limit: Number of results (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const workouts = await mapleService.getAvailableWorkouts(limit)

    return NextResponse.json({
      success: true,
      data: workouts,
    })
  } catch (error) {
    console.error('Error fetching available workouts:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
