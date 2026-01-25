"use client"

/**
 * SyncManager Component
 * Runs in the background to periodically sync data to Supabase when local instance is active.
 * This component renders nothing - it just manages the sync interval.
 * 
 * Only syncs when:
 * - Local instance is reachable (dynamic detection via connectivity)
 * - Supabase is properly configured
 */

import { useEffect, useRef, useCallback, useState } from "react"
import { useConnectivity } from "@/components/connectivity-provider"

interface SyncManagerProps {
  /** Sync interval in milliseconds (default: 30 seconds) */
  interval?: number
  /** Whether to sync immediately on mount */
  syncOnMount?: boolean
  /** Enable debug logging */
  debug?: boolean
}

interface SyncCapabilities {
  canSync: boolean
  supabaseConfigured: boolean
}

export function SyncManager({
  interval = 30000, // 30 seconds default
  syncOnMount = true,
  debug = false,
}: SyncManagerProps) {
  const { isInitialized, isLocalAvailable, apiBaseUrl } = useConnectivity()
  const [capabilities, setCapabilities] = useState<SyncCapabilities | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<Date | null>(null)

  const log = useCallback(
    (message: string, data?: unknown) => {
      if (debug) {
        console.log(`[SyncManager] ${message}`, data ?? "")
      }
    },
    [debug]
  )

  // Check if sync is available (Supabase configured) - only when local is available
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        // Use the appropriate API base URL
        const response = await fetch(`${apiBaseUrl}/api/sync`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setCapabilities({
              canSync: data.data.canSync,
              supabaseConfigured: data.data.supabaseConfigured,
            })
            log("Capabilities checked", data.data)
          }
        }
      } catch {
        setCapabilities({ canSync: false, supabaseConfigured: false })
      }
    }

    if (isInitialized && isLocalAvailable) {
      checkCapabilities()
    } else if (isInitialized && !isLocalAvailable) {
      // Clear capabilities when local is not available
      setCapabilities(null)
    }
  }, [isInitialized, isLocalAvailable, apiBaseUrl, log])

  const performSync = useCallback(async () => {
    try {
      log("Starting sync...")
      // Use the appropriate API base URL
      const response = await fetch(`${apiBaseUrl}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeAuth: false }), // Only sync unauthenticated services
      })

      if (!response.ok) {
        // 400 means Supabase not configured - this is expected, not an error
        if (response.status === 400) {
          log("Sync skipped (Supabase not configured)")
          return
        }
        throw new Error(`Sync failed: ${response.status}`)
      }

      const result = await response.json()
      lastSyncRef.current = new Date()

      if (result.success && result.data) {
        log("Sync completed", {
          totalRecords: result.data.totalRecordsWritten,
          duration: `${result.data.durationMs}ms`,
          services: result.data.services?.map((s: { service: string; success: boolean; recordsWritten: number }) => 
            `${s.service}: ${s.success ? s.recordsWritten : 'failed'}`
          ),
        })
      }
    } catch (error) {
      log("Sync error", error)
    }
  }, [apiBaseUrl, log])

  useEffect(() => {
    // Don't run if not initialized or local not available
    if (!isInitialized || !isLocalAvailable) {
      log("Sync disabled (local not available)")
      return
    }

    // Don't run if Supabase isn't configured
    if (capabilities && !capabilities.canSync) {
      log("Sync disabled (Supabase not configured)")
      return
    }

    // Wait for capabilities check
    if (!capabilities) {
      return
    }

    log(`Sync enabled, interval: ${interval}ms`)

    // Initial sync on mount
    if (syncOnMount) {
      performSync()
    }

    // Set up interval
    intervalRef.current = setInterval(performSync, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isInitialized, isLocalAvailable, capabilities, interval, syncOnMount, performSync, log])

  // This component renders nothing
  return null
}
