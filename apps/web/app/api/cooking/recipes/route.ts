/**
 * Recipe API Routes
 * GET - List recipes with filters
 * POST - Create new recipe
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookingService } from '@/lib/services/cooking.service'
import type { RecipeFilters, CreateRecipeInput } from '@/lib/types/cooking.types'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/recipes
 * List recipes with optional filters. Returns slim `RecipeListItem[]` by default
 * (no `instructions`, no `notes`, no extended nutrition). Pass `?full=1` to get
 * full `Recipe[]` rows (used by detail/export callers).
 *
 * Query params:
 *   - search: Search by name
 *   - tags: Comma-separated tags
 *   - source: 'trader_joes' | 'custom'
 *   - difficulty: 'easy' | 'medium' | 'hard'
 *   - is_favorite: 'true' | 'false'
 *   - full: '1' to include instructions/notes (default: slim)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: RecipeFilters = {}

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search') || undefined
    }

    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')?.split(',').filter(Boolean)
    }

    if (searchParams.get('source')) {
      filters.source = searchParams.get('source') as RecipeFilters['source']
    }

    if (searchParams.get('difficulty')) {
      filters.difficulty = searchParams.get('difficulty') as RecipeFilters['difficulty']
    }

    if (searchParams.get('is_favorite')) {
      filters.is_favorite = searchParams.get('is_favorite') === 'true'
    }

    const fullShape = searchParams.get('full') === '1'
    const recipes = fullShape
      ? await cookingService.getRecipes({ ...filters, fullShape: true })
      : await cookingService.getRecipes(filters)

    const response = NextResponse.json({
      success: true,
      data: recipes,
    })
    // Recipe library changes rarely; allow a minute of fresh caching plus a
    // long SWR window so the dashboard repaint is instant after the first load.
    response.headers.set(
      'Cache-Control',
      'private, max-age=60, stale-while-revalidate=600'
    )
    return withCors(response)
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
 * POST /api/cooking/recipes
 * Create a new recipe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input: CreateRecipeInput = body

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Recipe name is required',
          },
          { status: 400 }
        )
      )
    }

    const recipe = await cookingService.createRecipe(input)

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
