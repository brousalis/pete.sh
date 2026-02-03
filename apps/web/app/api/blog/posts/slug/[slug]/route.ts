/**
 * Blog Posts API - Get Post by Slug
 * GET: Get single post by slug (for public blog)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'
import { blogService } from '@/lib/services/blog.service'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/blog/posts/slug/[slug]
 * Get a single blog post by slug
 * Use ?public=true for public blog (only published posts)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get('public') === 'true'

    let post
    if (publicOnly) {
      post = await blogService.getPublishedPostBySlug(slug)
    } else {
      post = await blogService.getPostBySlug(slug)
    }

    if (!post) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Post not found',
          },
          { status: 404 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: post,
      })
    )
  } catch (error) {
    console.error('Error fetching blog post by slug:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch post',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
