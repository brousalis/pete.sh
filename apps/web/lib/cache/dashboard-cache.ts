'use client'

/**
 * Persisted dashboard cache (IndexedDB via idb-keyval).
 *
 * Stores the aggregate dashboard snapshot keyed by (day, weekStart) so that
 * returning users see the last dashboard instantly while the server revalidates
 * in the background (stale-while-revalidate).
 *
 * All ops fail silently — cache is a perf optimization, never a correctness
 * dependency.
 */

import { createStore, get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'

/** Versioned so we can invalidate stale shapes by bumping. */
const CACHE_VERSION = 1
const DB_NAME = 'petehome-dashboard-cache'
const STORE_NAME = 'snapshots'

/** How long a snapshot is considered fresh (do not show stale indicator). */
export const CACHE_FRESH_MS = 60_000 // 1 minute
/** Hard upper bound; snapshots older than this are ignored entirely. */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24h

export interface CachedSnapshot<T> {
  v: number
  t: number // timestamp (ms)
  data: T
}

let store: ReturnType<typeof createStore> | null = null
function getStore() {
  if (typeof window === 'undefined') return null
  if (store) return store
  try {
    store = createStore(DB_NAME, STORE_NAME)
    return store
  } catch {
    return null
  }
}

export function buildDashboardCacheKey(day: string, weekStartISO: string): string {
  return `v${CACHE_VERSION}:${day}:${weekStartISO}`
}

export async function readCachedSnapshot<T>(
  key: string
): Promise<CachedSnapshot<T> | null> {
  const s = getStore()
  if (!s) return null
  try {
    const entry = (await idbGet(key, s)) as CachedSnapshot<T> | undefined
    if (!entry || entry.v !== CACHE_VERSION) return null
    if (Date.now() - entry.t > CACHE_MAX_AGE_MS) {
      void idbDel(key, s).catch(() => {})
      return null
    }
    return entry
  } catch {
    return null
  }
}

export async function writeCachedSnapshot<T>(
  key: string,
  data: T
): Promise<void> {
  const s = getStore()
  if (!s) return
  try {
    const entry: CachedSnapshot<T> = { v: CACHE_VERSION, t: Date.now(), data }
    await idbSet(key, entry, s)
  } catch {
    /* silently ignore */
  }
}

export function isSnapshotFresh(entry: CachedSnapshot<unknown>): boolean {
  return Date.now() - entry.t < CACHE_FRESH_MS
}
