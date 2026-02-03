/**
 * Coffee Recipe by ID API Routes
 * GET - Get single recipe
 * PUT - Update recipe
 * DELETE - Delete recipe
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/coffee/config/recipes/[id]
 * Get single recipe
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const recipe = await coffeeConfigService.getRecipe(id)

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
 * PUT /api/coffee/config/recipes/[id]
 * Update recipe
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const recipe = await coffeeConfigService.updateRecipe(id, body)

    if (!recipe) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update recipe',
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
 * DELETE /api/coffee/config/recipes/[id]
 * Delete recipe
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await coffeeConfigService.deleteRecipe(id)

    return withCors(
      NextResponse.json({
        success: true,
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
