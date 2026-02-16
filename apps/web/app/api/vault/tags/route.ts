/**
 * Vault Tags API
 * GET: Get all unique tags with counts
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { vaultService } from '@/lib/services/vault.service'
import { NextResponse } from 'next/server'

/**
 * GET /api/vault/tags
 * Get all unique vault note tags with their counts
 */
export async function GET() {
  try {
    const tags = await vaultService.getTags()

    return withCors(
      NextResponse.json({
        success: true,
        data: { tags },
      })
    )
  } catch (error) {
    console.error('Error fetching vault tags:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch tags',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
