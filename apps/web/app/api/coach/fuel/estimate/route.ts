/**
 * POST /api/coach/fuel/estimate — LLM nutrition estimate from free text (unsaved)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  estimateFuelFromText,
  FuelEstimateBlockedError,
  countFuelEstimatesToday,
  FUEL_ESTIMATE_DAILY_SOFT_CAP,
} from '@/lib/services/coach/fuel.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  description: z.string().min(2).max(1000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('Invalid estimate request.', 400)
    }

    const estimate = await estimateFuelFromText(parsed.data.description)
    const used = await countFuelEstimatesToday()

    return successResponse({
      ...estimate,
      description: parsed.data.description.trim(),
      estimatesUsedToday: used,
      estimateSoftCap: FUEL_ESTIMATE_DAILY_SOFT_CAP,
    })
  } catch (error) {
    if (error instanceof FuelEstimateBlockedError) {
      return errorResponse(
        { code: error.code, message: error.message },
        429
      )
    }
    return handleApiError(error)
  }
}
