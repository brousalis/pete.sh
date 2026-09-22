/**
 * GET  /api/coach/fuel/entries — list entries for a date (+ recent reuse)
 * POST /api/coach/fuel/entries — confirm-save an entry and recompute the day
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  createFuelEntry,
  fuelItemSchema,
  listFuelEntries,
  listRecentFuelReuse,
} from '@/lib/services/coach/fuel.service'
import { getNutritionTargets } from '@/lib/services/coach/nutrition.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: z.enum(['food', 'drink', 'other']),
  descriptionRaw: z.string().min(1).max(1000),
  items: z.array(fuelItemSchema).max(20).optional(),
  kcal: z.number().int().min(0).max(10000),
  proteinG: z.number().int().min(0).max(500),
  carbsG: z.number().int().min(0).max(1500),
  fatG: z.number().int().min(0).max(400),
  assumptions: z.string().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  source: z.enum(['llm', 'manual', 'reuse']),
})

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined
    const includeRecent = request.nextUrl.searchParams.get('recent') !== '0'

    const [entries, recent] = await Promise.all([
      listFuelEntries(date),
      includeRecent ? listRecentFuelReuse(8) : Promise.resolve([]),
    ])

    return successResponse({ entries, recent })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('Invalid fuel entry.', 400)
    }

    const entry = await createFuelEntry(parsed.data)
    const nutrition = await getNutritionTargets(parsed.data.date)

    return successResponse({ entry, nutrition })
  } catch (error) {
    return handleApiError(error)
  }
}
