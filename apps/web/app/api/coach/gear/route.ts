/**
 * GET  /api/coach/gear — inventory with auto-accumulated mileage
 * POST /api/coach/gear — add an item
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  createGearItem,
  fetchGearInventory,
  recomputeGearUsage,
} from '@/lib/services/coach/gear.service'
import { gearWriteSchema } from '@/lib/services/coach/gear.schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const includeRetired = request.nextUrl.searchParams.get('includeRetired') === '1'

    // Recompute on demand so the page never shows stale mileage; the nightly
    // job keeps it warm so this is normally a no-op.
    if (request.nextUrl.searchParams.get('recompute') === '1') {
      await recomputeGearUsage()
    }

    return successResponse(await fetchGearInventory(includeRetired))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = gearWriteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const id = await createGearItem(parsed.data)
    await recomputeGearUsage()

    const inventory = await fetchGearInventory(true)
    return successResponse({ id, ...inventory })
  } catch (error) {
    return handleApiError(error)
  }
}
