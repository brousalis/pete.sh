/**
 * Vault Service
 * Handles database operations for vault notes
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
  VaultNote,
  VaultNoteSummary,
  VaultNoteFilters,
  VaultNotePagination,
  CreateVaultNoteInput,
  UpdateVaultNoteInput,
  DbVaultNote,
  DbVaultNoteInsert,
  DbVaultNoteUpdate,
} from '@/lib/types/vault.types'

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function dbNoteToApp(row: DbVaultNote): VaultNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentHtml: row.content_html,
    tags: row.tags || [],
    isPinned: row.is_pinned,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dbNoteToSummary(row: DbVaultNote): VaultNoteSummary {
  // Generate a plain-text preview from HTML content
  let contentPreview: string | null = null
  if (row.content_html) {
    const text = row.content_html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    contentPreview = text.length > 120 ? text.slice(0, 120) + '...' : text
  }

  return {
    id: row.id,
    title: row.title,
    contentPreview,
    tags: row.tags || [],
    isPinned: row.is_pinned,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// VAULT SERVICE CLASS
// ============================================================================

class VaultService {
  // ============================================
  // GET NOTES (LIST)
  // ============================================
  async getNotes(
    filters?: VaultNoteFilters,
    pagination?: VaultNotePagination
  ): Promise<{ notes: VaultNoteSummary[]; total: number }> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      return { notes: [], total: 0 }
    }

    const page = pagination?.page ?? 1
    const pageSize = pagination?.pageSize ?? 50
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('vault_notes')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters?.tag) {
      query = query.contains('tags', [filters.tag])
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,content_html.ilike.%${filters.search}%`
      )
    }

    if (filters?.pinned !== undefined) {
      query = query.eq('is_pinned', filters.pinned)
    }

    // Order: pinned first, then by updated_at descending
    query = query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching vault notes:', error)
      return { notes: [], total: 0 }
    }

    return {
      notes: (data as DbVaultNote[]).map(dbNoteToSummary),
      total: count ?? 0,
    }
  }

  // ============================================
  // GET SINGLE NOTE
  // ============================================
  async getNote(id: string): Promise<VaultNote | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return null

    const { data, error } = await supabase
      .from('vault_notes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching vault note:', error)
      return null
    }

    return dbNoteToApp(data as DbVaultNote)
  }

  // ============================================
  // CREATE NOTE
  // ============================================
  async createNote(input: CreateVaultNoteInput): Promise<VaultNote | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return null

    const insertData: DbVaultNoteInsert = {
      title: input.title || 'Untitled',
      content: input.content || { type: 'doc', content: [] },
      content_html: input.contentHtml || null,
      tags: input.tags || [],
      is_pinned: input.isPinned || false,
      source_url: input.sourceUrl || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('vault_notes')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating vault note:', error)
      return null
    }

    return dbNoteToApp(data as DbVaultNote)
  }

  // ============================================
  // UPDATE NOTE
  // ============================================
  async updateNote(
    id: string,
    input: UpdateVaultNoteInput
  ): Promise<VaultNote | null> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return null

    const updateData: DbVaultNoteUpdate = {}

    if (input.title !== undefined) updateData.title = input.title
    if (input.content !== undefined) updateData.content = input.content
    if (input.contentHtml !== undefined)
      updateData.content_html = input.contentHtml
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.isPinned !== undefined) updateData.is_pinned = input.isPinned
    if (input.sourceUrl !== undefined) updateData.source_url = input.sourceUrl

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('vault_notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating vault note:', error)
      return null
    }

    return dbNoteToApp(data as DbVaultNote)
  }

  // ============================================
  // DELETE NOTE
  // ============================================
  async deleteNote(id: string): Promise<boolean> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) return false

    const { error } = await supabase
      .from('vault_notes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting vault note:', error)
      return false
    }

    return true
  }

  // ============================================
  // TOGGLE PIN
  // ============================================
  async togglePin(id: string): Promise<VaultNote | null> {
    const note = await this.getNote(id)
    if (!note) return null

    return this.updateNote(id, { isPinned: !note.isPinned })
  }

  // ============================================
  // GET ALL TAGS
  // ============================================
  async getTags(): Promise<Array<{ tag: string; count: number }>> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return []

    const { data, error } = await supabase
      .from('vault_notes')
      .select('tags')

    if (error) {
      console.error('Error fetching vault tags:', error)
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

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }
}

export const vaultService = new VaultService()
