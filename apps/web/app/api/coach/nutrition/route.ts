/**
 * GET  /api/coach/nutrition — targets for a date, periodised to training load
 * POST /api/coach/nutrition — hydration / adherence / notes only (macros via Fuel)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getNutritionTargets, logNutritionMeta } from '@/lib/services/coach/nutrition.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined
    return successResponse(await getNutritionTargets(date))
  } catch (error) {
    return handleApiError(error)
  }
}

const metaSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hydrationMl: z.number().int().min(0).max(15000).optional(),
  adherence: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = metaSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('Invalid nutrition meta.', 400)
    }

    if (
      parsed.data.hydrationMl == null &&
      parsed.data.adherence == null &&
      parsed.data.notes == null
    ) {
      return errorResponse('Provide hydrationMl, adherence, or notes.', 400)
    }

    await logNutritionMeta(parsed.data)

    return successResponse(await getNutritionTargets(parsed.data.date))
  } catch (error) {
    return handleApiError(error)
  }
}
