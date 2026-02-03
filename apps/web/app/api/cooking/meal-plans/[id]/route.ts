/**
 * Single Meal Plan API Routes
 * GET - Get meal plan with recipes
 * PUT - Update meal plan
 * DELETE - Delete meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import type { UpdateMealPlanInput } from '@/lib/types/cooking.types'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/meal-plans/[id]
 * Get a meal plan with recipes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const mealPlan = await mealPlanningService.getMealPlanById(id)

    if (!mealPlan) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Meal plan not found',
          },
          { status: 404 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: mealPlan,
      })
    )
  } catch (error) {
    console.error('Error fetching meal plan:', error)
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
 * PUT /api/cooking/meal-plans/[id]
 * Update a meal plan
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const input: UpdateMealPlanInput = body

    // Get existing meal plan to preserve week_start_date
    const existing = await mealPlanningService.getMealPlanById(id)
    if (!existing) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Meal plan not found',
          },
          { status: 404 }
        )
      )
    }

    const mealPlan = await mealPlanningService.saveMealPlan({
      ...input,
      week_start_date: existing.week_start_date,
    })

    return withCors(
      NextResponse.json({
        success: true,
        data: mealPlan,
      })
    )
  } catch (error) {
    console.error('Error updating meal plan:', error)
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
 * DELETE /api/cooking/meal-plans/[id]
 * Delete a meal plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await mealPlanningService.deleteMealPlan(id)

    return withCors(
      NextResponse.json({
        success: true,
        message: 'Meal plan deleted',
      })
    )
  } catch (error) {
    console.error('Error deleting meal plan:', error)
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
