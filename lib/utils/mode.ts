/**
 * Mode Detection Utilities
 * Determines whether the app is running in local or production mode
 * 
 * Local mode: Connects to real services and writes snapshots to Supabase
 * Production mode: Reads cached data from Supabase, controls disabled
 */

export type DeploymentMode = 'local' | 'production'

/**
 * Get the current deployment mode from environment variable
 * Defaults to 'local' if not set
 */
export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.DEPLOYMENT_MODE?.toLowerCase()
  
  if (mode === 'production') {
    return 'production'
  }
  
  // Default to local mode for development
  return 'local'
}

/**
 * Check if running in local mode
 * Local mode has full access to real services and can write to Supabase
 */
export function isLocalMode(): boolean {
  return getDeploymentMode() === 'local'
}

/**
 * Check if running in production mode
 * Production mode reads from Supabase and has controls disabled
 */
export function isProductionMode(): boolean {
  return getDeploymentMode() === 'production'
}

/**
 * Check if controls should be enabled
 * Controls are only enabled in local mode
 */
export function areControlsEnabled(): boolean {
  return isLocalMode()
}

/**
 * Require local mode for an operation
 * Throws an error if not in local mode
 */
export function requireLocalMode(operation: string = 'This action'): void {
  if (!isLocalMode()) {
    throw new Error(`${operation} is only available in local mode`)
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
    error: 'This action is only available when running locally. The web version is read-only.'
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
} {
  const mode = getDeploymentMode()
  const isLocal = mode === 'local'
  
  return {
    mode,
    isLocal,
    isProduction: !isLocal,
    controlsEnabled: isLocal,
    displayName: isLocal ? 'Local Mode' : 'Live View',
    description: isLocal 
      ? 'Connected to real devices'
      : "Live from Pete's apartment"
  }
}
