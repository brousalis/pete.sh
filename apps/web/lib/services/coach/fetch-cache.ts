/**
 * Fetch with Next.js caching hints that also works outside Next.
 *
 * The coach services run in two places: Next.js route handlers, where the
 * `next.revalidate` option deduplicates and caches upstream calls, and the
 * PM2 worker, which is plain Node and has no such option in its RequestInit
 * type. This keeps the hint where it helps without breaking the worker build.
 */

export interface CachedFetchOptions extends RequestInit {
  /** Seconds to cache the response for, when running under Next.js. */
  revalidateSeconds?: number
}

export function cachedFetch(
  url: string | URL,
  options: CachedFetchOptions = {}
): Promise<Response> {
  const { revalidateSeconds, ...init } = options

  if (revalidateSeconds != null) {
    // Ignored by Node's fetch; honoured by Next's.
    ;(init as RequestInit & { next?: { revalidate: number } }).next = {
      revalidate: revalidateSeconds,
    }
  }

  return fetch(url, init)
}
