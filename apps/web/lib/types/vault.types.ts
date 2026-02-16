/**
 * Vault Types
 * TypeScript types for vault notes, editor state, and API responses
 */

import type { JSONContent } from '@tiptap/react'

// ============================================================================
// VAULT NOTE TYPES
// ============================================================================

/**
 * Full vault note as returned from database
 */
export interface VaultNote {
  id: string
  title: string
  content: JSONContent
  contentHtml: string | null
  tags: string[]
  isPinned: boolean
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Vault note for list views (without full content)
 */
export interface VaultNoteSummary {
  id: string
  title: string
  contentPreview: string | null
  tags: string[]
  isPinned: boolean
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new vault note
 */
export interface CreateVaultNoteInput {
  title?: string
  content?: JSONContent
  contentHtml?: string
  tags?: string[]
  isPinned?: boolean
  sourceUrl?: string
}

/**
 * Input for updating a vault note
 */
export interface UpdateVaultNoteInput {
  title?: string
  content?: JSONContent
  contentHtml?: string
  tags?: string[]
  isPinned?: boolean
  sourceUrl?: string | null
}

// ============================================================================
// DATABASE ROW TYPES (snake_case)
// ============================================================================

export interface DbVaultNote {
  id: string
  title: string
  content: JSONContent
  content_html: string | null
  tags: string[]
  is_pinned: boolean
  source_url: string | null
  created_at: string
  updated_at: string
}

export interface DbVaultNoteInsert {
  id?: string
  title?: string
  content?: JSONContent
  content_html?: string | null
  tags?: string[]
  is_pinned?: boolean
  source_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface DbVaultNoteUpdate {
  title?: string
  content?: JSONContent
  content_html?: string | null
  tags?: string[]
  is_pinned?: boolean
  source_url?: string | null
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface VaultNotesListResponse {
  notes: VaultNoteSummary[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface VaultTagsResponse {
  tags: Array<{
    tag: string
    count: number
  }>
}

// ============================================================================
// FILTER & PAGINATION
// ============================================================================

export interface VaultNoteFilters {
  tag?: string
  search?: string
  pinned?: boolean
}

export interface VaultNotePagination {
  page: number
  pageSize: number
}
