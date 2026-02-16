/**
 * Apple Health Daily Metrics API
 * POST - Save daily health metrics from PeteWatch
 * GET - Get daily metrics for a date range
 */

import { NextRequest, NextResponse } from 'next/server'
import { appleHealthService } from '@/lib/services/apple-health.service'
import { verifyPeteWatchAuth } from '@/lib/api/petewatch-auth'
import type { DailyHealthMetrics } from '@/lib/types/apple-health.types'

/**
 * POST /api/apple-health/daily
 * Save daily health metrics
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyPeteWatchAuth(request)
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const metrics: DailyHealthMetrics = body.metrics || body

    // Debug: log body composition fields arriving from iOS
    console.log(`[Daily Metrics] ${metrics.date} | bodyMassLbs=${metrics.bodyMassLbs} bodyFatPct=${metrics.bodyFatPercentage} leanMassLbs=${metrics.leanBodyMassLbs}`)

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
          syncMetadata: {
            lastSyncTimestamp: today.recorded_at,
            dataDate: today.date,
          },
        })
      }
      
      // Otherwise fetch from range
      const metrics = await appleHealthService.getDailyMetrics(30)
      const match = metrics.find(m => m.date === specificDate)
      
      return NextResponse.json({
        success: true,
        data: match || null,
        syncMetadata: match ? {
          lastSyncTimestamp: match.recorded_at,
          dataDate: match.date,
        } : null,
      })
    }

    const metrics = await appleHealthService.getDailyMetrics(daysBack)

    // Calculate sync metadata from the most recent record
    const mostRecentSync = metrics.length > 0
      ? metrics.reduce((latest, current) => 
          new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
        )
      : null

    return NextResponse.json({
      success: true,
      data: metrics,
      syncMetadata: mostRecentSync ? {
        lastSyncTimestamp: mostRecentSync.recorded_at,
        totalDays: metrics.length,
        dateRange: {
          start: metrics[metrics.length - 1]?.date,
          end: metrics[0]?.date,
        },
      } : null,
    })
  } catch (error) {
    console.error('Error fetching daily metrics:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
