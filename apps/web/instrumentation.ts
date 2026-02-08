/**
 * Next.js Instrumentation
 *
 * This file is loaded by Next.js at startup and can be used to set up
 * logging, monitoring, and other instrumentation.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import logger for startup message
    const { logger } = await import('@/lib/logger')

    // Log startup (only if not using custom server which has its own banner)
    if (!process.env.CUSTOM_SERVER) {
      const port = process.env.PORT || 3000
      const env = process.env.NODE_ENV || 'development'
      logger.startup(Number(port), env)
    }
  }
}
