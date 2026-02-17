/**
 * Fridge Scan Update API Route
 * PUT - Update confirmed items and recipes matched count for a scan
 */

import { NextRequest, NextResponse } from 'next/server'
import { confirmScan } from '@/lib/services/fridge-scan.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * PUT /api/cooking/fridge-scan/[id]
 * Body: { confirmed_items: string[], recipes_matched: number }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { confirmed_items, recipes_matched } = body as {
      confirmed_items: string[]
      recipes_matched: number
    }

    if (!Array.isArray(confirmed_items)) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'confirmed_items must be an array of strings.' },
          { status: 400 }
        )
      )
    }

    const scan = await confirmScan(id, confirmed_items, recipes_matched ?? 0)

    return withCors(
      NextResponse.json({
        success: true,
        data: scan,
      })
    )
  } catch (error) {
    console.error('[Fridge Scan API] PUT error:', error)
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
