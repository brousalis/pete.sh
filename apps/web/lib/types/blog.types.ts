/**
 * Blog Types
 * TypeScript types for blog posts, editor state, and API responses
 */

import type { JSONContent } from '@tiptap/react'

// ============================================================================
// POST STATUS
// ============================================================================

export type BlogPostStatus = 'draft' | 'published'

// ============================================================================
// BLOG POST TYPES
// ============================================================================

/**
 * Full blog post as stored in database
 */
export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: JSONContent
  contentHtml: string | null
  featuredImage: string | null
  status: BlogPostStatus
  tags: string[]
  readingTimeMinutes: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Blog post for list views (without full content)
 */
export interface BlogPostSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featuredImage: string | null
  status: BlogPostStatus
  tags: string[]
  readingTimeMinutes: number | null
  publishedAt: string | null
  createdAt: string
}

/**
 * Input for creating a new blog post
 */
export interface CreateBlogPostInput {
  title: string
  slug?: string // Auto-generated if not provided
  excerpt?: string
  content: JSONContent
  contentHtml?: string
  featuredImage?: string
  status?: BlogPostStatus
  tags?: string[]
}

/**
 * Input for updating a blog post
 */
export interface UpdateBlogPostInput {
  title?: string
  slug?: string
  excerpt?: string
  content?: JSONContent
  contentHtml?: string
  featuredImage?: string
  status?: BlogPostStatus
  tags?: string[]
  publishedAt?: string | null
}

// ============================================================================
// DATABASE ROW TYPES (snake_case)
// ============================================================================

export interface DbBlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: JSONContent
  content_html: string | null
  featured_image: string | null
  status: BlogPostStatus
  tags: string[]
  reading_time_minutes: number | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface DbBlogPostInsert {
  id?: string
  title: string
  slug: string
  excerpt?: string | null
  content: JSONContent
  content_html?: string | null
  featured_image?: string | null
  status?: BlogPostStatus
  tags?: string[]
  reading_time_minutes?: number | null
  published_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface DbBlogPostUpdate {
  title?: string
  slug?: string
  excerpt?: string | null
  content?: JSONContent
  content_html?: string | null
  featured_image?: string | null
  status?: BlogPostStatus
  tags?: string[]
  reading_time_minutes?: number | null
  published_at?: string | null
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface BlogPostsListResponse {
  posts: BlogPostSummary[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface BlogTagsResponse {
  tags: Array<{
    tag: string
    count: number
  }>
}

// ============================================================================
// EDITOR TYPES
// ============================================================================

export interface BlogEditorState {
  post: BlogPost | null
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: string | null
  error: string | null
}

export interface ImageUploadResult {
  url: string
  path: string
  filename: string
}

// ============================================================================
// FILTER & PAGINATION
// ============================================================================

export interface BlogPostFilters {
  status?: BlogPostStatus
  tag?: string
  search?: string
}

export interface BlogPostPagination {
  page: number
  pageSize: number
}
