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
 * Query params:
 *   - regenerate: if "true", force-regenerate from current meal plan recipes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const forceRegenerate = searchParams.get('regenerate') === 'true'

    let shoppingList = forceRegenerate
      ? null
      : await mealPlanningService.getShoppingList(id)

    // Generate if it doesn't exist or regeneration was requested
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
 * DELETE /api/cooking/meal-plans/[id]/shopping-list
 * Delete/clear the shopping list for a meal plan
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await mealPlanningService.deleteShoppingList(id)

    return withCors(
      NextResponse.json({
        success: true,
        message: 'Shopping list deleted',
      })
    )
  } catch (error) {
    console.error('Error deleting shopping list:', error)
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
 * Actions:
 *   { action: 'add_recipe', recipeId: string } — Add one recipe's ingredients to the shopping list
 *   { status: 'draft' | 'active' | 'completed' } — Update shopping list status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'add_recipe' && body.recipeId) {
      const shoppingList = await mealPlanningService.addRecipeToShoppingList(id, body.recipeId)
      return withCors(
        NextResponse.json({ success: true, data: shoppingList })
      )
    }

    const { status } = body
    if (!status || !['draft', 'active', 'completed'].includes(status)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Invalid action or status',
          },
          { status: 400 }
        )
      )
    }

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
