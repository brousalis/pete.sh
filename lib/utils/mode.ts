/**
 * Mode Detection Utilities
 * Determines whether the app is running in local or production mode
 *
 * Mode is auto-detected based on service reachability:
 * - Local mode: Local services (like Hue bridge) are reachable
 * - Production mode: Local services are not reachable, read from cache
 *
 * DEPLOYMENT_MODE env var is no longer required - mode is auto-detected.
 */

import { isAnyLocalServiceAvailable, getServiceAvailabilityStatus } from '@/lib/adapters/base.adapter'

export type DeploymentMode = 'local' | 'production'

/**
 * Get the current deployment mode based on service availability
 *
 * This is now auto-detected:
 * - If any local service is reachable: 'local'
 * - If no local services are reachable: 'production'
 */
export function getDeploymentMode(): DeploymentMode {
  // Check if any local service is available based on cached checks
  if (isAnyLocalServiceAvailable()) {
    return 'local'
  }
  return 'production'
}

/**
 * Check if any local service is available
 * This uses cached results from service availability checks
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
