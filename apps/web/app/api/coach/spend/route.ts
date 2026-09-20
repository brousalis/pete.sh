/**
 * GET   /api/coach/spend — spend breakdown for the settings panel
 * PATCH /api/coach/spend — adjust the budget caps
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { coachDb } from '@/lib/services/coach/coach-data.service'
import { getSpendSummary } from '@/lib/services/coach/cost.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return successResponse(await getSpendSummary())
  } catch (error) {
    return handleApiError(error)
  }
}

const capsSchema = z.object({
  dailyCapUsd: z.number().min(1).max(200).optional(),
  monthlyCapUsd: z.number().min(10).max(2000).optional(),
  degradeAtPct: z.number().int().min(50).max(100).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const parsed = capsSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('Invalid budget values.', 400)
    }

    const db = coachDb()
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = `${today.slice(0, 7)}-01`

    if (parsed.data.dailyCapUsd != null || parsed.data.degradeAtPct != null) {
      await db
        .from('coach_cost_budget')
        .update({
          ...(parsed.data.dailyCapUsd != null ? { cap_usd: parsed.data.dailyCapUsd } : {}),
          ...(parsed.data.degradeAtPct != null ? { degrade_at_pct: parsed.data.degradeAtPct } : {}),
        })
        .eq('period', 'day')
        .eq('period_start', today)
    }

    if (parsed.data.monthlyCapUsd != null) {
      await db
        .from('coach_cost_budget')
        .update({ cap_usd: parsed.data.monthlyCapUsd })
        .eq('period', 'month')
        .eq('period_start', monthStart)
    }

    return successResponse(await getSpendSummary())
  } catch (error) {
    return handleApiError(error)
  }
}
