/**
 * GET  /api/coach/gear — inventory with auto-accumulated mileage
 * POST /api/coach/gear — add an item
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { coachDb } from '@/lib/services/coach/coach-data.service'
import { getGearAlerts, listGear, listRecommendations, recomputeGearUsage } from '@/lib/services/coach/gear.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Recompute on demand so the page never shows stale mileage; the nightly
    // job keeps it warm so this is normally a no-op.
    if (request.nextUrl.searchParams.get('recompute') === '1') {
      await recomputeGearUsage()
    }

    const [items, recommendations, alerts] = await Promise.all([
      listGear(request.nextUrl.searchParams.get('includeRetired') === '1'),
      listRecommendations(),
      getGearAlerts(),
    ])

    return successResponse({ items, recommendations, alerts })
  } catch (error) {
    return handleApiError(error)
  }
}

const gearSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(['shoes', 'bike', 'component', 'wetsuit', 'sensor', 'apparel', 'other']),
  sport: z.enum(['swim', 'bike', 'run', 'strength']).optional(),
  brand: z.string().max(60).optional(),
  model: z.string().max(80).optional(),
  purchasedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  costUsd: z.number().positive().optional(),
  /** Service life in miles; shoes are typically 300–500. */
  lifeLimitMiles: z.number().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = gearSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const input = parsed.data

    const { data, error } = await coachDb()
      .from('coach_gear_item')
      .insert({
        name: input.name,
        category: input.category,
        sport: input.sport ?? null,
        brand: input.brand ?? null,
        model: input.model ?? null,
        purchased_on: input.purchasedOn ?? null,
        cost_usd: input.costUsd ?? null,
        life_limit_meters: input.lifeLimitMiles ? input.lifeLimitMiles * 1609.344 : null,
      })
      .select('id')
      .single()

    if (error) return errorResponse(error.message, 500)

    // Backfill mileage for anything already recorded since the purchase date.
    await recomputeGearUsage()

    return successResponse({ id: data.id })
  } catch (error) {
    return handleApiError(error)
  }
}
