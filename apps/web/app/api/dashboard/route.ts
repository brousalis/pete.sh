/**
 * Dashboard Aggregate API
 * GET /api/dashboard - Fetches all dashboard data in a single request
 *
 * Query params:
 *   - day: Day of week (e.g. tuesday)
 *   - week_start: YYYY-MM-DD (Monday of the week)
 *   - week: ISO week number (for HealthKit linked workouts)
 *   - year: Year (for HealthKit linked workouts)
 *   - max_calendar_results: Max calendar events (default 10)
 *   - debug: If "1", include timing metadata in response
 *
 * Returns partial data on per-section failure. Never throws; always returns 200.
 */

import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import {
  getDashboardAggregate,
  type DashboardAggregateData,
  type DashboardDataErrors,
  type DashboardScope,
} from '@/lib/server/dashboard-aggregate'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { NextRequest, NextResponse } from 'next/server'

export type {
  ActivityDailyMetrics,
  ActivityWeeklySummary,
  DashboardAggregateData,
  DashboardDataErrors,
} from '@/lib/server/dashboard-aggregate'

interface DashboardResponse {
  success: boolean
  data: DashboardAggregateData
  errors?: DashboardDataErrors
  _meta?: Record<string, number>
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const dayParam = searchParams.get('day')?.toLowerCase() || 'monday'
  const weekStartStr = searchParams.get('week_start')
  const weekParam = searchParams.get('week')
  const yearParam = searchParams.get('year')
  const maxCalendarResults = parseInt(
    searchParams.get('max_calendar_results') || '10',
    10
  )
  const debug = searchParams.get('debug') === '1'
  const scopeParam = searchParams.get('scope')
  const scope: DashboardScope =
    scopeParam === 'critical' || scopeParam === 'secondary'
      ? scopeParam
      : 'all'

  const day = dayParam as DayOfWeek
  const weekStart = weekStartStr
    ? new Date(weekStartStr + 'T12:00:00')
    : new Date()
  const fitnessAdapter = getFitnessAdapter()
  const weekNumber = weekParam
    ? parseInt(weekParam, 10)
    : fitnessAdapter.getCurrentWeekNumber()
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const { data, errors, meta } = await getDashboardAggregate({
    day,
    weekStart,
    weekNumber,
    year,
    maxCalendarResults,
    scope,
  })

  const payload: DashboardResponse = {
    success: true,
    data,
  }
  if (Object.keys(errors).length > 0) {
    payload.errors = errors
  }
  if (debug) {
    payload._meta = meta
  }

  const response = NextResponse.json(payload)
  // Allow CDN / browser to serve a stale body instantly while revalidating in the
  // background. private = per-user; no s-maxage since content is personalized.
  response.headers.set(
    'Cache-Control',
    'private, max-age=0, stale-while-revalidate=60'
  )
  response.headers.set('Vary', 'Cookie, Authorization')
  return response
}
