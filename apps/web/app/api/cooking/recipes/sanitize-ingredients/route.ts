/**
 * Ingredient Sanitization API
 * POST - Bulk sanitize TJ's branding from recipe ingredients and cache
 *
 * Query params:
 *   dry_run=true (default) — preview changes without writing
 *   dry_run=false          — commit changes to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookingService } from '@/lib/services/cooking.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

export async function POST(request: NextRequest) {
  try {
    const dryRun = request.nextUrl.searchParams.get('dry_run') !== 'false'

    const [ingredientReport, cacheReport] = await Promise.all([
      cookingService.sanitizeAllIngredients(dryRun),
      cookingService.sanitizeRecipeCache(dryRun),
    ])

    return withCors(
      NextResponse.json({
        success: true,
        data: {
          dry_run: dryRun,
          ingredients: ingredientReport,
          cache: cacheReport,
        },
      })
    )
  } catch (error) {
    console.error('Error sanitizing ingredients:', error)
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
