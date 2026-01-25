/**
 * Client-side hook for deployment mode detection
 * 
 * Uses an API endpoint to get the deployment mode from the server
 * since environment variables aren't directly accessible on the client
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
 * Hook to get the current deployment mode
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
 */
export function useControlsEnabled(): boolean {
  const { mode } = useDeploymentMode()
  return mode.controlsEnabled
}

/**
 * Hook to check if in read-only mode (production)
 */
export function useReadOnlyMode(): boolean {
  const { mode } = useDeploymentMode()
  return mode.isProduction
}
