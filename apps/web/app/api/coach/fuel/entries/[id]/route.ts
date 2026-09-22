/**
 * PATCH  /api/coach/fuel/entries/[id] — edit entry macros / description
 * DELETE /api/coach/fuel/entries/[id] — remove entry and recompute day
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  deleteFuelEntry,
  fuelItemSchema,
  updateFuelEntry,
} from '@/lib/services/coach/fuel.service'
import { getNutritionTargets } from '@/lib/services/coach/nutrition.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  kind: z.enum(['food', 'drink', 'other']).optional(),
  descriptionRaw: z.string().min(1).max(1000).optional(),
  items: z.array(fuelItemSchema).max(20).optional(),
  kcal: z.number().int().min(0).max(10000).optional(),
  proteinG: z.number().int().min(0).max(500).optional(),
  carbsG: z.number().int().min(0).max(1500).optional(),
  fatG: z.number().int().min(0).max(400).optional(),
  assumptions: z.string().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  source: z.enum(['llm', 'manual', 'reuse']).optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('Invalid fuel entry update.', 400)
    }

    const entry = await updateFuelEntry(id, parsed.data)
    const nutrition = await getNutritionTargets(entry.logDate)

    return successResponse({ entry, nutrition })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Need date before delete for nutrition refresh — deleteFuelEntry loads it.
    const { coachDb } = await import('@/lib/services/coach/coach-data.service')
    const existing = await coachDb()
      .from('coach_fuel_entry')
      .select('log_date')
      .eq('id', id)
      .maybeSingle()

    const logDate =
      existing.data != null
        ? String((existing.data as { log_date: string }).log_date)
        : undefined

    await deleteFuelEntry(id)
    const nutrition = logDate ? await getNutritionTargets(logDate) : null

    return successResponse({ deleted: true, nutrition })
  } catch (error) {
    return handleApiError(error)
  }
}
