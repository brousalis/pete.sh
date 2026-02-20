/**
 * Nutrition Enrichment API - Single Recipe
 * POST - Enrich a single recipe with nutritional data
 *
 * Body: { recipe_id: string, force?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { enrichRecipe } from '@/lib/services/nutrition.service'
import type { RecipeIngredient } from '@/lib/types/cooking.types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipe_id, force } = body as { recipe_id: string; force?: boolean }

    if (!recipe_id) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'recipe_id is required' },
          { status: 400 }
        )
      )
    }

    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        )
      )
    }

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .single()

    if (recipeError || !recipe) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'Recipe not found' },
          { status: 404 }
        )
      )
    }

    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipe_id)
      .order('order_index')

    const result = await enrichRecipe(
      {
        ...recipe,
        nutrition_category: recipe.nutrition_category ?? [],
        ingredients: (ingredients ?? []) as RecipeIngredient[],
      },
      force ?? false
    )

    return withCors(
      NextResponse.json({ success: true, data: result })
    )
  } catch (error) {
    console.error('Error enriching recipe:', error)
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
