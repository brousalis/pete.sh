/**
 * Coffee Roast Strategies API Routes
 * GET - List roast strategies
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextResponse } from 'next/server'

/**
 * GET /api/coffee/config/roast-strategies
 * List roast strategies
 */
export async function GET() {
  try {
    const strategies = await coffeeConfigService.getRoastStrategies()

    return withCors(
      NextResponse.json({
        success: true,
        data: strategies,
      })
    )
  } catch (error) {
    console.error('Error fetching roast strategies:', error)
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
