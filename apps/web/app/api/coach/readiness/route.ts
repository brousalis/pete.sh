/**
 * GET /api/coach/readiness — readiness v2 for a date (defaults to today)
 *
 * Replaces /api/fitness/ai-coach/readiness. The old score mixed physiology
 * with schedule adherence; this one is physiology plus load plus symptoms,
 * each scored against the athlete's own rolling baseline.
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { computeAndStoreReadiness } from '@/lib/services/coach/analytics.service'
import { readinessGuidance } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined
    const readiness = await computeAndStoreReadiness(date)

    return successResponse({
      ...readiness,
      guidance: readinessGuidance(readiness.level),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
