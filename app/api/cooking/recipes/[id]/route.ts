/**
 * Single Recipe API Routes
 * GET - Get recipe with ingredients
 * PUT - Update recipe (creates new version)
 * DELETE - Delete recipe
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookingService } from '@/lib/services/cooking.service'
import type { UpdateRecipeInput } from '@/lib/types/cooking.types'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/recipes/[id]
 * Get a single recipe with ingredients
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recipe = await cookingService.getRecipe(id)

    if (!recipe) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Recipe not found',
          },
          { status: 404 }
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
    console.error('Error fetching recipe:', error)
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
 * PUT /api/cooking/recipes/[id]
 * Update a recipe (creates a new version)
 * Body: UpdateRecipeInput with optional commit_message
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commit_message, ...updateData }: UpdateRecipeInput & { commit_message?: string } =
      body

    const recipe = await cookingService.updateRecipe(id, updateData, commit_message)

    return withCors(
      NextResponse.json({
        success: true,
        data: recipe,
      })
    )
  } catch (error) {
    console.error('Error updating recipe:', error)
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
 * DELETE /api/cooking/recipes/[id]
 * Delete a recipe
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await cookingService.deleteRecipe(id)

    return withCors(
      NextResponse.json({
        success: true,
        message: 'Recipe deleted',
      })
    )
  } catch (error) {
    console.error('Error deleting recipe:', error)
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
