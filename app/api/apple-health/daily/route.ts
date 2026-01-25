/**
 * Apple Health Daily Metrics API
 * POST - Save daily health metrics from PeteWatch
 * GET - Get daily metrics for a date range
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'
import type { DailyHealthMetrics } from '@/lib/types/apple-health.types'

// API Key for PeteWatch authentication
const PETEWATCH_API_KEY = process.env.PETEWATCH_API_KEY

/**
 * Verify PeteWatch API key
 */
function verifyApiKey(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === PETEWATCH_API_KEY
}

/**
 * POST /api/apple-health/daily
 * Save daily health metrics
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const metrics: DailyHealthMetrics = body.metrics || body

    // Validate required fields
    if (!metrics.date) {
      return NextResponse.json(
        { success: false, error: 'Missing required date field' },
        { status: 400 }
      )
    }

    const success = await appleHealthService.saveDailyMetrics(metrics)

    return NextResponse.json({
      success,
      message: success ? 'Daily metrics saved' : 'Failed to save metrics',
    })
  } catch (error) {
    console.error('Error saving daily metrics:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/apple-health/daily
 * Get daily metrics for a date range
 * Query params:
 *   - days: Number of days to look back (default 7)
 *   - date: Specific date (YYYY-MM-DD) to get metrics for
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const specificDate = searchParams.get('date')
    const daysBack = parseInt(searchParams.get('days') || '7', 10)

    if (specificDate) {
      // Get today's metrics
      const today = await appleHealthService.getTodayMetrics()
      if (today && today.date === specificDate) {
        return NextResponse.json({
          success: true,
          data: today,
        })
      }
      
      // Otherwise fetch from range
      const metrics = await appleHealthService.getDailyMetrics(30)
      const match = metrics.find(m => m.date === specificDate)
      
      return NextResponse.json({
        success: true,
        data: match || null,
      })
    }

    const metrics = await appleHealthService.getDailyMetrics(daysBack)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error('Error fetching daily metrics:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
