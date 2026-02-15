/**
 * Blog Posts API - Collection Routes
 * GET: List posts (with optional filters)
 * POST: Create new post (localhost only)
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { blogService } from '@/lib/services/blog.service'
import type { BlogPostFilters, CreateBlogPostInput } from '@/lib/types/blog.types'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Check if request is from localhost
 */
function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0] ?? ''
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')
}

/**
 * GET /api/blog/posts
 * List blog posts with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as 'draft' | 'published' | null
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const publicOnly = searchParams.get('public') === 'true'

    // Build filters
    const filters: BlogPostFilters = {}
    if (status) filters.status = status
    if (tag) filters.tag = tag
    if (search) filters.search = search

    let result
    if (publicOnly) {
      // Public endpoint - only published posts
      result = await blogService.getPublishedPosts({ page, pageSize }, tag || undefined)
    } else {
      // Dashboard endpoint - all posts (but respect status filter)
      result = await blogService.getPosts(filters, { page, pageSize })
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: {
          posts: result.posts,
          total: result.total,
          page,
          pageSize,
          hasMore: page * pageSize < result.total,
        },
      })
    )
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch posts',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * POST /api/blog/posts
 * Create a new blog post (localhost only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check localhost
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Blog post creation is only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Title is required',
          },
          { status: 400 }
        )
      )
    }

    if (!body.content) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Content is required',
          },
          { status: 400 }
        )
      )
    }

    const input: CreateBlogPostInput = {
      title: body.title.trim(),
      slug: body.slug?.trim() || undefined,
      excerpt: body.excerpt?.trim() || undefined,
      content: body.content,
      contentHtml: body.contentHtml || undefined,
      featuredImage: body.featuredImage || undefined,
      status: body.status || 'draft',
      tags: body.tags || [],
    }

    const post = await blogService.createPost(input)

    if (!post) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to create post',
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
    console.error('Error creating blog post:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create post',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
