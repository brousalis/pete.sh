/**
 * Recipe Versions API Routes
 * GET - List all versions for a recipe
 * POST - Create new version (with commit message)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookingService } from '@/lib/services/cooking.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/recipes/[id]/versions
 * List all versions for a recipe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const versions = await cookingService.getRecipeVersions(id)

    return withCors(
      NextResponse.json({
        success: true,
        data: versions,
      })
    )
  } catch (error) {
    console.error('Error fetching versions:', error)
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
 * POST /api/cooking/recipes/[id]/versions
 * Create a new version manually (with commit message)
 * Body: { commit_message: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commit_message } = body

    if (!commit_message || commit_message.trim().length === 0) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Commit message is required',
          },
          { status: 400 }
        )
      )
    }

    // Get current recipe
    const currentRecipe = await cookingService.getRecipe(id)
    if (!currentRecipe) {
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

    // Create version by updating with the same data
    const recipe = await cookingService.updateRecipe(id, currentRecipe, commit_message)

    return withCors(
      NextResponse.json({
        success: true,
        data: recipe,
        message: 'Version created',
      })
    )
  } catch (error) {
    console.error('Error creating version:', error)
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
