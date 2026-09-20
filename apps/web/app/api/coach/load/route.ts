/**
 * GET /api/coach/load — PMC, ACWR, monotony and weekly totals
 *
 * Replaces the load-trend card's previous heuristic, which averaged synthetic
 * per-day loads derived from the scheduled workout type over 7 and 28 days.
 * This is measured TSS through the standard exponentially weighted forms.
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { getLoadSummary } from '@/lib/services/coach/analytics.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const days = Number(request.nextUrl.searchParams.get('days') ?? '120')
    const summary = await getLoadSummary(Number.isFinite(days) ? days : 120)

    return successResponse(summary)
  } catch (error) {
    return handleApiError(error)
  }
}
