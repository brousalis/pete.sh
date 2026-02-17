/**
 * Supabase Client
 * Initializes and exports Supabase clients for the application
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Typed Supabase client alias.
 * Note: We use `any` as the Database generic for createClient() because
 * supabase-js v2.91+ conditional type resolution fails with complex Database
 * types (36+ tables). Table/row typing is handled at the service layer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Check if a string is a valid HTTP/HTTPS URL
 */
function isValidUrl(urlString: string | undefined): boolean {
  if (!urlString) return false
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Check if Supabase is properly configured with valid credentials
 */
export function isSupabaseConfigured(): boolean {
  // Check that URL exists and is a valid HTTP/HTTPS URL
  if (!isValidUrl(supabaseUrl)) return false
  // Check that anon key exists and isn't a placeholder
  if (!supabaseAnonKey || supabaseAnonKey.includes('your-') || supabaseAnonKey.length < 20) return false
  return true
}

/**
 * Check if service role key is available and valid (for writes)
 */
export function hasServiceRoleKey(): boolean {
  if (!supabaseServiceKey) return false
  // Check it's not a placeholder
  if (supabaseServiceKey.includes('your-') || supabaseServiceKey.length < 20) return false
  return true
}

// Singleton instances
let anonClient: AnySupabaseClient | null = null
let serviceClient: AnySupabaseClient | null = null

/**
 * Get the public Supabase client (anon key)
 * Use this for read operations and client-side queries
 * Returns null if not configured (call isSupabaseConfigured() first)
 */
export function getSupabaseClient(): AnySupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!anonClient) {
    try {
      anonClient = createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } catch {
      return null
    }
  }

  return anonClient
}

/**
 * Get the service role Supabase client
 * Use this for server-side write operations (local mode only)
 * Returns null if not configured
 * WARNING: Never expose this in client-side code
 */
export function getSupabaseServiceClient(): AnySupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!hasServiceRoleKey()) {
    return null
  }

  if (!serviceClient) {
    try {
      serviceClient = createClient(supabaseUrl!, supabaseServiceKey!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } catch {
      return null
    }
  }

  return serviceClient
}

/**
 * Get the appropriate client based on operation type
 * - For reads: use anon client
 * - For writes: use service client (if available) or anon client
 * Returns null if Supabase is not configured
 */
export function getSupabaseClientForOperation(operation: 'read' | 'write'): AnySupabaseClient | null {
  if (operation === 'write' && hasServiceRoleKey()) {
    return getSupabaseServiceClient()
  }
  return getSupabaseClient()
}

// Export types for convenience
export type { Database }
