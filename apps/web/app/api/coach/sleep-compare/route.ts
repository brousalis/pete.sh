/**
 * GET /api/coach/sleep-compare — Apple Watch vs Polar Loop sleep detail.
 *
 * Evaluation only. Never feeds readiness / coach tools (Apple stays SoT).
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import { buildSleepCompareDetail } from '@/lib/services/coach/sleep-compare.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const raw = Number(request.nextUrl.searchParams.get('days') ?? '28')
    const days = Number.isFinite(raw) ? raw : 28
    const data = await buildSleepCompareDetail(days)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
