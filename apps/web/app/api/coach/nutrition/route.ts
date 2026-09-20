/**
 * GET  /api/coach/nutrition — targets for a date, periodised to training load
 * POST /api/coach/nutrition — log what was actually eaten
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getNutritionTargets, logNutrition } from '@/lib/services/coach/nutrition.service'

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

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kcal: z.number().int().min(0).max(10000).optional(),
  proteinG: z.number().int().min(0).max(500).optional(),
  carbsG: z.number().int().min(0).max(1500).optional(),
  fatG: z.number().int().min(0).max(400).optional(),
  hydrationMl: z.number().int().min(0).max(15000).optional(),
  adherence: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = logSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('Invalid nutrition log.', 400)
    }

    await logNutrition(parsed.data)

    return successResponse(await getNutritionTargets(parsed.data.date))
  } catch (error) {
    return handleApiError(error)
  }
}
