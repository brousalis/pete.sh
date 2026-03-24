/**
 * Calendar Accounts Service
 * CRUD operations for the calendar_accounts table.
 * Always uses the service-role Supabase client since this table
 * stores sensitive OAuth tokens (RLS denies anon access).
 */

import { getSupabaseServiceClient } from '@/lib/supabase/client'
import type {
  CalendarAccountInsert,
  CalendarAccountPublic,
  CalendarAccountRow,
  CalendarAccountUpdate,
} from '@/lib/types/calendar-account.types'

function getClient() {
  const client = getSupabaseServiceClient()
  if (!client) {
    throw new Error('[CalendarAccounts] Supabase service-role client not available')
  }
  return client
}

function stripTokens(row: CalendarAccountRow): CalendarAccountPublic {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    is_active: row.is_active,
    needs_reauth: row.needs_reauth,
    selected_calendars: row.selected_calendars ?? [],
    connected_at: row.connected_at,
    updated_at: row.updated_at,
  }
}

class CalendarAccountsService {
  async listAccounts(): Promise<CalendarAccountPublic[]> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('calendar_accounts') as any)
      .select('*')
      .order('connected_at', { ascending: true })

    if (error) throw error
    return ((data ?? []) as CalendarAccountRow[]).map(stripTokens)
  }

  async listActiveAccounts(): Promise<CalendarAccountRow[]> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('calendar_accounts') as any)
      .select('*')
      .eq('is_active', true)
      .eq('needs_reauth', false)
      .order('connected_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as CalendarAccountRow[]
  }

  async getAccountById(id: string): Promise<CalendarAccountRow | null> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('calendar_accounts') as any)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as CalendarAccountRow
  }

  async getAccountByEmail(email: string): Promise<CalendarAccountRow | null> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('calendar_accounts') as any)
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as CalendarAccountRow
  }

  /**
   * Upsert an account by email.
   * Used by the OAuth callback to create or update on re-auth.
   */
  async upsertAccount(insert: CalendarAccountInsert): Promise<CalendarAccountRow> {
    const client = getClient()
    const existing = await this.getAccountByEmail(insert.email)

    if (existing) {
      const updates: Record<string, unknown> = {
        access_token: insert.access_token,
        needs_reauth: false,
      }
      if (insert.refresh_token) updates.refresh_token = insert.refresh_token
      if (insert.expiry_date !== undefined) updates.expiry_date = insert.expiry_date
      if (insert.display_name) updates.display_name = insert.display_name

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client.from('calendar_accounts') as any)
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data as CalendarAccountRow
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('calendar_accounts') as any)
      .insert({
        email: insert.email,
        display_name: insert.display_name ?? null,
        access_token: insert.access_token,
        refresh_token: insert.refresh_token ?? null,
        expiry_date: insert.expiry_date ?? null,
        is_active: insert.is_active ?? true,
        needs_reauth: false,
        selected_calendars: insert.selected_calendars ?? [],
      })
      .select()
      .single()

    if (error) throw error
    return data as CalendarAccountRow
  }

  async updateAccount(id: string, updates: CalendarAccountUpdate): Promise<CalendarAccountRow> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('calendar_accounts') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as CalendarAccountRow
  }

  async deleteAccount(id: string): Promise<void> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('calendar_accounts') as any)
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async markNeedsReauth(id: string): Promise<void> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('calendar_accounts') as any)
      .update({ needs_reauth: true })
      .eq('id', id)

    if (error) {
      console.error('[CalendarAccounts] Failed to mark needs_reauth:', error)
    }
  }

  async updateTokens(
    id: string,
    tokens: { access_token: string; refresh_token?: string; expiry_date?: number }
  ): Promise<void> {
    const client = getClient()
    const updates: Record<string, unknown> = {
      access_token: tokens.access_token,
      needs_reauth: false,
    }
    if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token
    if (tokens.expiry_date !== undefined) updates.expiry_date = tokens.expiry_date

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('calendar_accounts') as any)
      .update(updates)
      .eq('id', id)

    if (error) throw error
  }

  async hasAnyAccounts(): Promise<boolean> {
    const client = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (client.from('calendar_accounts') as any)
      .select('id', { count: 'exact', head: true })

    if (error) return false
    return (count ?? 0) > 0
  }
}

export const calendarAccountsService = new CalendarAccountsService()
