/**
 * Maple Walk Statistics API
 * GET - Get aggregated walk statistics
 */

import { mapleService } from '@/lib/services/maple.service'
import { NextResponse } from 'next/server'

/**
 * GET /api/maple/stats
 * Get aggregated statistics for maple walks
 */
export async function GET() {
  try {
    const stats = await mapleService.getStats()

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching maple stats:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
