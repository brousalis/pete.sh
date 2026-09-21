/**
 * POST /api/coach/gear/[id]/service — log bike fit, chain, cleats, etc.
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { addGearService, fetchGearInventory } from '@/lib/services/coach/gear.service'
import { gearServiceSchema } from '@/lib/services/coach/gear.schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const parsed = gearServiceSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const serviceId = await addGearService(id, {
      serviceType: parsed.data.serviceType,
      performedOn: parsed.data.performedOn,
      dueOn: parsed.data.dueOn,
      intervalMiles: parsed.data.intervalMiles,
      notes: parsed.data.notes,
    })

    const includeRetired = request.nextUrl.searchParams.get('includeRetired') === '1'
    const inventory = await fetchGearInventory(includeRetired)
    return successResponse({ serviceId, ...inventory })
  } catch (error) {
    return handleApiError(error)
  }
}
