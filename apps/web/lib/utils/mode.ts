/**
 * Mode Detection Utilities
 * Determines whether the app is running in local or production mode
 *
 * Mode is auto-detected based on service reachability:
 * - Local mode: Local services (like Hue bridge) are reachable
 * - Production mode: Local services are not reachable, read from cache
 *
 * The availability cache is warmed by GET /api/health (Hue check). For routes
 * that gate on local mode (e.g. POST /api/sync, POST /api/spotify/player/play),
 * call ensureLocalAvailabilityChecked() first so the first request to that
 * process doesn't get a false 403 when the cache is still cold.
 */

import { isAnyLocalServiceAvailable, getServiceAvailabilityStatus } from '@/lib/adapters/base.adapter'

export type DeploymentMode = 'local' | 'production'

/**
 * Get the current deployment mode based on service availability
 * Uses cached results from service availability checks (see ensureLocalAvailabilityChecked).
 */
export function getDeploymentMode(): DeploymentMode {
  if (isAnyLocalServiceAvailable()) {
    return 'local'
  }
  return 'production'
}

/**
 * Check if any local service is available
 * Uses cached results from service availability checks
 */
export function isLocalMode(): boolean {
  return isAnyLocalServiceAvailable()
}

/**
 * Check if running in production mode (no local services available)
 */
export function isProductionMode(): boolean {
  return !isAnyLocalServiceAvailable()
}

/**
 * Warm the local availability cache before checking mode.
 * Call this in API routes that gate on local mode (sync, play, etc.) so the
 * first request to that process doesn't 403 due to a cold cache.
 * Same logic as GET /api/health: runs Hue adapter availability check.
 */
export async function ensureLocalAvailabilityChecked(): Promise<void> {
  try {
    const { getHueAdapter } = await import('@/lib/adapters/hue.adapter')
    const hueAdapter = getHueAdapter()
    await hueAdapter['isLocalServiceAvailable']()
  } catch {
    // Ignore errors - just means not available; cache will reflect that
  }
}

/**
 * Check if controls should be enabled
 * Controls are only enabled when local services are reachable
 */
export function areControlsEnabled(): boolean {
  return isLocalMode()
}

/**
 * Require local mode for an operation
 * Throws an error if no local services are available
 */
export function requireLocalMode(operation: string = 'This action'): void {
  if (!isLocalMode()) {
    throw new Error(`${operation} is only available when local services are reachable`)
  }
}

/**
 * Guard decorator for mutations - throws if not in local mode
 * Use this to protect mutation endpoints in API routes
 */
export function localModeGuard(): { allowed: boolean; error?: string } {
  if (isLocalMode()) {
    return { allowed: true }
  }

  return {
    allowed: false,
    error: 'This action is only available when local services are reachable. The web version is read-only.'
  }
}

/**
 * Get mode info for client-side display
 */
export function getModeInfo(): {
  mode: DeploymentMode
  isLocal: boolean
  isProduction: boolean
  controlsEnabled: boolean
  displayName: string
  description: string
  serviceStatus: ReturnType<typeof getServiceAvailabilityStatus>
} {
  const isLocal = isLocalMode()
  const mode = isLocal ? 'local' : 'production'

  return {
    mode,
    isLocal,
    isProduction: !isLocal,
    controlsEnabled: isLocal,
    displayName: isLocal ? 'Local Mode' : 'Live View',
    description: isLocal
      ? 'Connected to real devices'
      : "Live from Pete's apartment",
    serviceStatus: getServiceAvailabilityStatus(),
  }
}
