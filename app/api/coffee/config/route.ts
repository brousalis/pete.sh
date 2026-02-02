/**
 * Coffee Config API Routes
 * GET - Get all coffee configuration
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextResponse } from 'next/server'

/**
 * GET /api/coffee/config
 * Get complete coffee configuration
 */
export async function GET() {
  try {
    const config = await coffeeConfigService.getConfig()

    return withCors(
      NextResponse.json({
        success: true,
        data: config,
      })
    )
  } catch (error) {
    console.error('Error fetching coffee config:', error)
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
