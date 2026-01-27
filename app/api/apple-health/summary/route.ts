/**
 * Apple Health Summary API
 * GET - Get weekly training summary and trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'

/**
 * GET /api/apple-health/summary
 * Get training summary and trends
 * Query params:
 *   - weeks: Number of weeks to summarize (default 4)
 *   - type: 'weekly' | 'hr-trends' (default 'weekly')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'weekly'
    const weeks = parseInt(searchParams.get('weeks') || '4', 10)

    if (type === 'hr-trends') {
      const days = weeks * 7
      const trends = await appleHealthService.getHrTrends(days)
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'hr-trends',
          trends,
        },
      })
    }

    // Default: weekly summary
    const summary = await appleHealthService.getWeeklySummary(weeks)

    return NextResponse.json({
      success: true,
      data: {
        type: 'weekly',
        weeks: summary,
      },
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
