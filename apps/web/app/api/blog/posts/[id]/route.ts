/**
 * Blog Posts API - Single Post Routes
 * GET: Get single post by ID
 * PUT: Update post (localhost only)
 * DELETE: Delete post (localhost only)
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { blogService } from '@/lib/services/blog.service'
import type { UpdateBlogPostInput } from '@/lib/types/blog.types'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Check if request is from localhost
 */
function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0] ?? ''
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')
}

/**
 * GET /api/blog/posts/[id]
 * Get a single blog post by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const post = await blogService.getPost(id)

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
    console.error('Error fetching blog post:', error)
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

/**
 * PUT /api/blog/posts/[id]
 * Update a blog post (localhost only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check localhost
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Blog post editing is only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check post exists
    const existingPost = await blogService.getPost(id)
    if (!existingPost) {
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

    const input: UpdateBlogPostInput = {}

    if (body.title !== undefined) input.title = body.title.trim()
    if (body.slug !== undefined) input.slug = body.slug.trim()
    if (body.excerpt !== undefined) input.excerpt = body.excerpt?.trim() || null
    if (body.content !== undefined) input.content = body.content
    if (body.contentHtml !== undefined) input.contentHtml = body.contentHtml
    if (body.featuredImage !== undefined) input.featuredImage = body.featuredImage
    if (body.status !== undefined) input.status = body.status
    if (body.tags !== undefined) input.tags = body.tags
    if (body.publishedAt !== undefined) input.publishedAt = body.publishedAt

    const post = await blogService.updatePost(id, input)

    if (!post) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update post',
          },
          { status: 500 }
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
    console.error('Error updating blog post:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update post',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * DELETE /api/blog/posts/[id]
 * Delete a blog post (localhost only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check localhost
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Blog post deletion is only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const { id } = await params

    // Check post exists
    const existingPost = await blogService.getPost(id)
    if (!existingPost) {
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

    const success = await blogService.deletePost(id)

    if (!success) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to delete post',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
      })
    )
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete post',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
