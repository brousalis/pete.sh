/**
 * Trader Joe's Import API
 * POST - Import a Trader Joe's recipe into user's collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { traderJoesService } from '@/lib/services/trader-joes.service'
import { cookingService } from '@/lib/services/cooking.service'
import type { TraderJoesRecipe } from '@/lib/types/cooking.types'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * POST /api/cooking/trader-joes/import
 * Import a Trader Joe's recipe
 * Body: TraderJoesRecipe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tjRecipe: TraderJoesRecipe = body

    // Convert TJ recipe to our format
    const recipeInput = await traderJoesService.importRecipe(tjRecipe)

    // Create recipe in user's collection
    const recipe = await cookingService.createRecipe(recipeInput)

    return withCors(
      NextResponse.json({
        success: true,
        data: recipe,
        message: 'Recipe imported successfully',
      })
    )
  } catch (error) {
    console.error('Error importing TJ recipe:', error)
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
