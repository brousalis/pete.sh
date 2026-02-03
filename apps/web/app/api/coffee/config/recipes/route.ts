/**
 * Coffee Recipes API Routes
 * GET - List recipes
 * POST - Create recipe
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import type { BrewMethod } from '@/lib/types/coffee.types'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/coffee/config/recipes
 * List recipes with optional method filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const method = searchParams.get('method') as BrewMethod | null

    const recipes = await coffeeConfigService.getRecipes(method || undefined)

    return withCors(
      NextResponse.json({
        success: true,
        data: recipes,
      })
    )
  } catch (error) {
    console.error('Error fetching recipes:', error)
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
 * POST /api/coffee/config/recipes
 * Create a new recipe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.method || !body.cupSize || !body.roast) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Method, cupSize, and roast are required',
          },
          { status: 400 }
        )
      )
    }

    const recipe = await coffeeConfigService.createRecipe(body)

    if (!recipe) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to create recipe',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: recipe,
      })
    )
  } catch (error) {
    console.error('Error creating recipe:', error)
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

export async function OPTIONS() {
  return corsOptionsResponse()
}
