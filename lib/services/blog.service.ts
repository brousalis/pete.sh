/**
 * Blog Service
 * Handles database operations for blog posts
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
  BlogPost,
  BlogPostSummary,
  BlogPostFilters,
  BlogPostPagination,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  DbBlogPost,
  DbBlogPostInsert,
  DbBlogPostUpdate,
} from '@/lib/types/blog.types'

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function dbPostToApp(row: DbBlogPost): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    contentHtml: row.content_html,
    featuredImage: row.featured_image,
    status: row.status,
    tags: row.tags || [],
    readingTimeMinutes: row.reading_time_minutes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dbPostToSummary(row: DbBlogPost): BlogPostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    featuredImage: row.featured_image,
    status: row.status,
    tags: row.tags || [],
    readingTimeMinutes: row.reading_time_minutes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

/**
 * Calculate reading time based on HTML content (200 words per minute)
 */
export function calculateReadingTime(htmlContent: string | null): number {
  if (!htmlContent) return 1
  
  // Strip HTML tags and count words
  const text = htmlContent.replace(/<[^>]*>/g, ' ')
  const words = text.split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length
  
  // Minimum 1 minute, calculate based on 200 wpm
  return Math.max(1, Math.ceil(wordCount / 200))
}

// ============================================================================
// BLOG SERVICE CLASS
// ============================================================================

class BlogService {
  // ============================================
  // GET POSTS (LIST)
  // ============================================
  async getPosts(
    filters?: BlogPostFilters,
    pagination?: BlogPostPagination
  ): Promise<{ posts: BlogPostSummary[]; total: number }> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return { posts: [], total: 0 }
    }

    const page = pagination?.page ?? 1
    const pageSize = pagination?.pageSize ?? 10
    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.tag) {
      query = query.contains('tags', [filters.tag])
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`)
    }

    // Order by published_at for published posts, created_at for drafts
    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching blog posts:', error)
      return { posts: [], total: 0 }
    }

    return {
      posts: (data as DbBlogPost[]).map(dbPostToSummary),
      total: count ?? 0,
    }
  }

  // ============================================
  // GET PUBLISHED POSTS (PUBLIC)
  // ============================================
  async getPublishedPosts(
    pagination?: BlogPostPagination,
    tag?: string
  ): Promise<{ posts: BlogPostSummary[]; total: number }> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return { posts: [], total: 0 }
    }

    const page = pagination?.page ?? 1
    const pageSize = pagination?.pageSize ?? 10
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .not('published_at', 'is', null)

    if (tag) {
      query = query.contains('tags', [tag])
    }

    query = query
      .order('published_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching published posts:', error)
      return { posts: [], total: 0 }
    }

    return {
      posts: (data as DbBlogPost[]).map(dbPostToSummary),
      total: count ?? 0,
    }
  }

  // ============================================
  // GET SINGLE POST
  // ============================================
  async getPost(id: string): Promise<BlogPost | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching blog post:', error)
      return null
    }

    return dbPostToApp(data as DbBlogPost)
  }

  // ============================================
  // GET POST BY SLUG
  // ============================================
  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching blog post by slug:', error)
      return null
    }

    return dbPostToApp(data as DbBlogPost)
  }

  // ============================================
  // GET PUBLISHED POST BY SLUG (PUBLIC)
  // ============================================
  async getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .single()

    if (error) {
      console.error('Error fetching published post by slug:', error)
      return null
    }

    return dbPostToApp(data as DbBlogPost)
  }

  // ============================================
  // CREATE POST
  // ============================================
  async createPost(input: CreateBlogPostInput): Promise<BlogPost | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return null

    // Generate slug if not provided
    let slug = input.slug || generateSlug(input.title)

    // Check for slug uniqueness and append number if needed
    const existingSlug = await this.checkSlugExists(slug)
    if (existingSlug) {
      let counter = 1
      while (await this.checkSlugExists(`${slug}-${counter}`)) {
        counter++
      }
      slug = `${slug}-${counter}`
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(input.contentHtml || null)

    const insertData: DbBlogPostInsert = {
      title: input.title,
      slug,
      excerpt: input.excerpt || null,
      content: input.content,
      content_html: input.contentHtml || null,
      featured_image: input.featuredImage || null,
      status: input.status || 'draft',
      tags: input.tags || [],
      reading_time_minutes: readingTime,
      published_at: input.status === 'published' ? new Date().toISOString() : null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blog_posts')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating blog post:', error)
      return null
    }

    return dbPostToApp(data as DbBlogPost)
  }

  // ============================================
  // UPDATE POST
  // ============================================
  async updatePost(id: string, input: UpdateBlogPostInput): Promise<BlogPost | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return null

    const updateData: DbBlogPostUpdate = {}

    if (input.title !== undefined) updateData.title = input.title
    if (input.excerpt !== undefined) updateData.excerpt = input.excerpt
    if (input.content !== undefined) updateData.content = input.content
    if (input.contentHtml !== undefined) {
      updateData.content_html = input.contentHtml
      updateData.reading_time_minutes = calculateReadingTime(input.contentHtml)
    }
    if (input.featuredImage !== undefined) updateData.featured_image = input.featuredImage
    if (input.tags !== undefined) updateData.tags = input.tags

    // Handle slug change with uniqueness check
    if (input.slug !== undefined) {
      const existingPost = await this.getPost(id)
      if (existingPost && input.slug !== existingPost.slug) {
        const slugExists = await this.checkSlugExists(input.slug, id)
        if (slugExists) {
          throw new Error('Slug already exists')
        }
        updateData.slug = input.slug
      }
    }

    // Handle status change
    if (input.status !== undefined) {
      updateData.status = input.status
      
      // Set published_at when publishing for the first time
      if (input.status === 'published') {
        const existingPost = await this.getPost(id)
        if (existingPost && !existingPost.publishedAt) {
          updateData.published_at = new Date().toISOString()
        }
      }
    }

    // Allow explicit publishedAt override
    if (input.publishedAt !== undefined) {
      updateData.published_at = input.publishedAt
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating blog post:', error)
      return null
    }

    return dbPostToApp(data as DbBlogPost)
  }

  // ============================================
  // DELETE POST
  // ============================================
  async deletePost(id: string): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return false

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting blog post:', error)
      return false
    }

    return true
  }

  // ============================================
  // CHECK SLUG EXISTS
  // ============================================
  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return false

    let query = supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.limit(1)

    if (error) {
      console.error('Error checking slug:', error)
      return false
    }

    return data && data.length > 0
  }

  // ============================================
  // GET ALL TAGS
  // ============================================
  async getTags(): Promise<Array<{ tag: string; count: number }>> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    // Get all published posts and extract tags
    const { data, error } = await supabase
      .from('blog_posts')
      .select('tags')
      .eq('status', 'published')
      .not('published_at', 'is', null)

    if (error) {
      console.error('Error fetching tags:', error)
      return []
    }

    // Count tags manually
    const tagCounts: Record<string, number> = {}
    for (const row of data || []) {
      const tags = (row as { tags: string[] }).tags || []
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    // Convert to array and sort
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }

  // ============================================
  // PUBLISH POST
  // ============================================
  async publishPost(id: string): Promise<BlogPost | null> {
    return this.updatePost(id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
    })
  }

  // ============================================
  // UNPUBLISH POST
  // ============================================
  async unpublishPost(id: string): Promise<BlogPost | null> {
    return this.updatePost(id, {
      status: 'draft',
    })
  }
}

export const blogService = new BlogService()
