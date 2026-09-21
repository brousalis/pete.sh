/**
 * PATCH  /api/coach/gear/[id] — update an item (dates, retire, life limit, …)
 * DELETE /api/coach/gear/[id] — remove item and linked usage
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  deleteGearItem,
  fetchGearInventory,
  recomputeGearUsage,
  updateGearItem,
} from '@/lib/services/coach/gear.service'
import { gearPatchSchema } from '@/lib/services/coach/gear.schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const parsed = gearPatchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorResponse('No fields to update.', 400)
    }

    await updateGearItem(id, parsed.data)
    await recomputeGearUsage()

    const includeRetired = request.nextUrl.searchParams.get('includeRetired') === '1'
    return successResponse(await fetchGearInventory(includeRetired))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    await deleteGearItem(id)

    const includeRetired = request.nextUrl.searchParams.get('includeRetired') === '1'
    return successResponse(await fetchGearInventory(includeRetired))
  } catch (error) {
    return handleApiError(error)
  }
}
