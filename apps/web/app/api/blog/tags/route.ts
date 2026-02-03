/**
 * Blog Tags API
 * GET: Get all tags with counts
 */

import { NextResponse } from 'next/server'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'
import { blogService } from '@/lib/services/blog.service'

/**
 * GET /api/blog/tags
 * Get all tags from published posts with counts
 */
export async function GET() {
  try {
    const tags = await blogService.getTags()

    return withCors(
      NextResponse.json({
        success: true,
        data: { tags },
      })
    )
  } catch (error) {
    console.error('Error fetching blog tags:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch tags',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
