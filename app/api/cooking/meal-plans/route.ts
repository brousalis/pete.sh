/**
 * Meal Plans API Routes
 * GET - Get meal plans (filter by week)
 * POST - Create/update meal plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import type { CreateMealPlanInput } from '@/lib/types/cooking.types'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/meal-plans
 * Get meal plan for a specific week
 * Query params:
 *   - week_start: ISO date string (optional, defaults to current week)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('week_start')

    const weekStart = weekStartParam ? new Date(weekStartParam) : undefined
    const mealPlan = await mealPlanningService.getMealPlan(weekStart)

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
 * POST /api/cooking/meal-plans
 * Create or update a meal plan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input: CreateMealPlanInput = body

    if (!input.week_start_date) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'week_start_date is required',
          },
          { status: 400 }
        )
      )
    }

    const mealPlan = await mealPlanningService.saveMealPlan(input)

    return withCors(
      NextResponse.json({
        success: true,
        data: mealPlan,
      })
    )
  } catch (error) {
    console.error('Error saving meal plan:', error)
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
