/**
 * Next.js instrumentation — startup banner for the Node runtime.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.CUSTOM_SERVER) return

  const port = process.env.PORT || 7331
  const env = process.env.NODE_ENV || 'development'
  console.log(`[petehome] listening on :${port} (${env})`)
}
