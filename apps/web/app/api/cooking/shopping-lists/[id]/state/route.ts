import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import type { ShoppingListStatePatch } from '@/lib/types/cooking.types'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as ShoppingListStatePatch

    const patch: ShoppingListStatePatch = {}
    if (body.checked_items !== undefined) patch.checked_items = body.checked_items
    if (body.hidden_items !== undefined) patch.hidden_items = body.hidden_items
    if (body.manual_items !== undefined) patch.manual_items = body.manual_items
    if (body.trips !== undefined) patch.trips = body.trips

    if (Object.keys(patch).length === 0) {
      return withCors(
        NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
      )
    }

    await mealPlanningService.updateShoppingListState(id, patch)

    return withCors(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Error updating shopping list state:', error)
    return withCors(
      NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
