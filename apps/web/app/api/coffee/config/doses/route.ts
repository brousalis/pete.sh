/**
 * Coffee Quick Doses API Routes
 * GET - List doses
 * POST - Create dose
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import type { BrewMethod } from '@/lib/types/coffee.types'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/coffee/config/doses
 * List quick doses with optional method filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const method = searchParams.get('method') as BrewMethod | null

    const doses = await coffeeConfigService.getQuickDoses(method || undefined)

    return withCors(
      NextResponse.json({
        success: true,
        data: doses,
      })
    )
  } catch (error) {
    console.error('Error fetching quick doses:', error)
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
 * POST /api/coffee/config/doses
 * Create a new quick dose
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.method || !body.label || body.grams === undefined) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Method, label, and grams are required',
          },
          { status: 400 }
        )
      )
    }

    const dose = await coffeeConfigService.createQuickDose(body)

    if (!dose) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to create quick dose',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: dose,
      })
    )
  } catch (error) {
    console.error('Error creating quick dose:', error)
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
