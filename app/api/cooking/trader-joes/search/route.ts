/**
 * Trader Joe's Search API
 * GET - Search Trader Joe's recipes (from cache)
 */

import { NextRequest, NextResponse } from 'next/server'
import { traderJoesService } from '@/lib/services/trader-joes.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/trader-joes/search
 * Search Trader Joe's recipes
 * Query params:
 *   - query: Search query string
 *   - category: Filter by category (dinner, breakfast, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || undefined
    const category = searchParams.get('category') || undefined

    const recipes = await traderJoesService.searchRecipes(query, category)

    return withCors(
      NextResponse.json({
        success: true,
        data: recipes,
      })
    )
  } catch (error) {
    console.error('Error searching TJ recipes:', error)
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
