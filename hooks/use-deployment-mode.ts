/**
 * Client-side hook for deployment mode detection
 * 
 * DEPRECATED: Prefer using useConnectivity from @/components/connectivity-provider
 * 
 * This hook is kept for backwards compatibility with existing components.
 * It now primarily serves as a fallback for components not yet within
 * the ConnectivityProvider, using the /api/mode endpoint.
 * 
 * For new code, use:
 * - useConnectivity() - Full connectivity state
 * - useIsReadOnly() - Check if read-only
 * - useControlsEnabled() - Check if controls enabled
 */

"use client"

import { useEffect, useState } from "react"

export interface DeploymentModeInfo {
  mode: "local" | "production"
  isLocal: boolean
  isProduction: boolean
  controlsEnabled: boolean
  displayName: string
  description: string
}

const defaultMode: DeploymentModeInfo = {
  mode: "local",
  isLocal: true,
  isProduction: false,
  controlsEnabled: true,
  displayName: "Local Mode",
  description: "Connected to real devices",
}

/**
 * Hook to get the current deployment mode from server
 * 
 * NOTE: This hook uses the static DEPLOYMENT_MODE env var.
 * For dynamic connectivity-based mode detection, use useConnectivity instead.
 */
export function useDeploymentMode(): {
  mode: DeploymentModeInfo
  isLoading: boolean
  error: string | null
} {
  const [mode, setMode] = useState<DeploymentModeInfo>(defaultMode)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetch("/api/mode")
        if (!response.ok) {
          throw new Error("Failed to fetch deployment mode")
        }
        const data = await response.json()
        if (data.success && data.data) {
          setMode(data.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        // Default to local mode on error
        setMode(defaultMode)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMode()
  }, [])

  return { mode, isLoading, error }
}

/**
 * Hook to check if controls should be disabled
 * 
 * NOTE: For dynamic detection, use useControlsEnabled from connectivity-provider
 */
export function useControlsEnabled(): boolean {
  const { mode } = useDeploymentMode()
  return mode.controlsEnabled
}

/**
 * Hook to check if in read-only mode (production)
 * 
 * NOTE: For dynamic detection, use useIsReadOnly from connectivity-provider
 */
export function useReadOnlyMode(): boolean {
  const { mode } = useDeploymentMode()
  return mode.isProduction
}
