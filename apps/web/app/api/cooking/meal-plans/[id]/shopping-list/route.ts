/**
 * Shopping List API Routes
 * GET - Generate/get shopping list from meal plan
 * POST - Update shopping list status
 */

import { NextRequest, NextResponse } from 'next/server'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/meal-plans/[id]/shopping-list
 * Generate or get shopping list for a meal plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if shopping list exists
    let shoppingList = await mealPlanningService.getShoppingList(id)

    // If it doesn't exist, generate it
    if (!shoppingList) {
      shoppingList = await mealPlanningService.generateShoppingList(id)
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: shoppingList,
      })
    )
  } catch (error) {
    console.error('Error fetching shopping list:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * POST /api/cooking/meal-plans/[id]/shopping-list
 * Update shopping list status
 * Body: { status: 'draft' | 'active' | 'completed' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['draft', 'active', 'completed'].includes(status)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Invalid status. Must be draft, active, or completed',
          },
          { status: 400 }
        )
      )
    }

    // Get shopping list first
    const shoppingList = await mealPlanningService.getShoppingList(id)
    if (!shoppingList) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Shopping list not found',
          },
          { status: 404 }
        )
      )
    }

    await mealPlanningService.updateShoppingListStatus(shoppingList.id, status)

    return withCors(
      NextResponse.json({
        success: true,
        message: 'Shopping list status updated',
      })
    )
  } catch (error) {
    console.error('Error updating shopping list:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    )
  }
}
