"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { setApiBaseUrl } from "@/lib/api/client"

// ============================================
// Types
// ============================================

export interface ConnectivityState {
  /** Whether we've completed the initial connectivity check */
  isInitialized: boolean
  /** Whether the local instance is currently reachable */
  isLocalAvailable: boolean
  /** Whether we're currently checking connectivity */
  isChecking: boolean
  /** The base URL to use for API calls */
  apiBaseUrl: string
  /** The local instance URL (for display/debugging) */
  localUrl: string | null
  /** Last successful check timestamp */
  lastChecked: Date | null
  /** Error from last check attempt */
  lastError: string | null
  /** Number of consecutive failures */
  failureCount: number
}

export interface ConnectivityContextValue extends ConnectivityState {
  /** Manually trigger a connectivity check */
  checkConnectivity: () => Promise<boolean>
  /** Force switch to local mode (if available) */
  forceLocal: () => void
  /** Force switch to production mode */
  forceProduction: () => void
  /** Reset to automatic detection */
  resetToAuto: () => void
  /** Whether controls should be enabled based on connectivity */
  controlsEnabled: boolean
  /** Whether we're in effective read-only mode */
  isReadOnly: boolean
  /** Display-friendly status */
  statusLabel: string
}

// ============================================
// Constants
// ============================================

/** How long to cache a successful connectivity check (ms) */
const CACHE_TTL_SUCCESS = 30_000 // 30 seconds

/** How long to cache a failed connectivity check (ms) */
const CACHE_TTL_FAILURE = 10_000 // 10 seconds

/** Timeout for connectivity check requests (ms) */
const CHECK_TIMEOUT = 3_000 // 3 seconds

/** Maximum consecutive failures before giving up periodic checks */
const MAX_FAILURES_BEFORE_BACKOFF = 5

/** Backoff interval after max failures (ms) */
const BACKOFF_INTERVAL = 60_000 // 1 minute

// ============================================
// Context
// ============================================

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null)

// ============================================
// Provider
// ============================================

interface ConnectivityProviderProps {
  children: ReactNode
  /** Optional: Override the local URL (defaults to env var) */
  localUrl?: string
  /** Optional: Disable automatic checking */
  disableAutoCheck?: boolean
  /** Optional: Custom check interval (ms) */
  checkInterval?: number
}

export function ConnectivityProvider({
  children,
  localUrl: localUrlProp,
  disableAutoCheck = false,
  checkInterval = CACHE_TTL_SUCCESS,
}: ConnectivityProviderProps) {
  // Get local URL from prop or environment variable
  const localUrl = localUrlProp ?? process.env.NEXT_PUBLIC_LOCAL_API_URL ?? null

  // State
  const [state, setState] = useState<ConnectivityState>({
    isInitialized: false,
    isLocalAvailable: false,
    isChecking: false,
    apiBaseUrl: "", // Empty string means use relative URLs (current host)
    localUrl,
    lastChecked: null,
    lastError: null,
    failureCount: 0,
  })

  // Track if user has forced a mode
  const [forcedMode, setForcedMode] = useState<"local" | "production" | null>(null)

  // Ref to track if component is mounted
  const isMountedRef = useRef(true)

  // ============================================
  // Connectivity Check Function
  // ============================================

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    // If no local URL configured, we can't check
    if (!localUrl) {
      console.log("[Connectivity] No local URL configured (NEXT_PUBLIC_LOCAL_API_URL not set)")
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLocalAvailable: false,
        apiBaseUrl: "",
        lastError: "No local URL configured",
      }))
      return false
    }

    console.log(`[Connectivity] Checking local availability at ${localUrl}/api/health`)
    setState((prev) => ({ ...prev, isChecking: true }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

      const response = await fetch(`${localUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
        // Don't send credentials to avoid CORS issues
        credentials: "omit",
        cache: "no-store",
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("[Connectivity] Health check response:", data)

      // Verify it's the right instance
      if (data.instanceId !== "petehome-local") {
        throw new Error("Invalid instance response")
      }

      // Only in local mode on that instance should we enable controls
      const isLocalInstance = data.mode === "local"
      console.log(`[Connectivity] Local mode: ${isLocalInstance}, setting apiBaseUrl to: ${isLocalInstance ? localUrl : "(relative)"}`)

      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLocalAvailable: isLocalInstance,
          isChecking: false,
          apiBaseUrl: isLocalInstance ? localUrl : "",
          lastChecked: new Date(),
          lastError: null,
          failureCount: 0,
        }))
      }

      return isLocalInstance
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.log(`[Connectivity] Health check failed: ${errorMessage}`)

      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isLocalAvailable: false,
          isChecking: false,
          apiBaseUrl: "",
          lastChecked: new Date(),
          lastError: errorMessage,
          failureCount: prev.failureCount + 1,
        }))
      }

      return false
    }
  }, [localUrl])

  // ============================================
  // Force Mode Functions
  // ============================================

  const forceLocal = useCallback(() => {
    if (localUrl) {
      setForcedMode("local")
      setState((prev) => ({
        ...prev,
        apiBaseUrl: localUrl,
      }))
    }
  }, [localUrl])

  const forceProduction = useCallback(() => {
    setForcedMode("production")
    setState((prev) => ({
      ...prev,
      apiBaseUrl: "",
    }))
  }, [])

  const resetToAuto = useCallback(() => {
    setForcedMode(null)
    // Trigger a fresh check
    checkConnectivity()
  }, [checkConnectivity])

  // ============================================
  // Effects
  // ============================================

  // Initial check on mount
  useEffect(() => {
    isMountedRef.current = true
    checkConnectivity()

    return () => {
      isMountedRef.current = false
    }
  }, [checkConnectivity])

  // Periodic checks
  useEffect(() => {
    if (disableAutoCheck || forcedMode) {
      return
    }

    // Use backoff interval if we've had too many failures
    const interval =
      state.failureCount >= MAX_FAILURES_BEFORE_BACKOFF
        ? BACKOFF_INTERVAL
        : state.isLocalAvailable
          ? CACHE_TTL_SUCCESS
          : CACHE_TTL_FAILURE

    const timerId = setInterval(() => {
      // Only check if the tab is visible
      if (document.visibilityState === "visible") {
        checkConnectivity()
      }
    }, interval)

    return () => clearInterval(timerId)
  }, [
    disableAutoCheck,
    forcedMode,
    state.failureCount,
    state.isLocalAvailable,
    checkConnectivity,
  ])

  // Re-check when tab becomes visible
  useEffect(() => {
    if (disableAutoCheck || forcedMode) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if cache is stale
        const now = new Date()
        const cacheTtl = state.isLocalAvailable
          ? CACHE_TTL_SUCCESS
          : CACHE_TTL_FAILURE
        const isStale =
          !state.lastChecked ||
          now.getTime() - state.lastChecked.getTime() > cacheTtl

        if (isStale) {
          checkConnectivity()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [
    disableAutoCheck,
    forcedMode,
    state.isLocalAvailable,
    state.lastChecked,
    checkConnectivity,
  ])

  // Sync API base URL with the client module
  useEffect(() => {
    let effectiveApiBaseUrl = state.apiBaseUrl

    if (forcedMode === "local" && localUrl) {
      effectiveApiBaseUrl = localUrl
    } else if (forcedMode === "production") {
      effectiveApiBaseUrl = ""
    }

    console.log(`[Connectivity] Syncing API base URL: "${effectiveApiBaseUrl || '(relative)'}" (forced: ${forcedMode || 'none'})`)
    setApiBaseUrl(effectiveApiBaseUrl)
  }, [state.apiBaseUrl, forcedMode, localUrl])

  // ============================================
  // Computed Values
  // ============================================

  const contextValue = useMemo<ConnectivityContextValue>(() => {
    // Determine effective state based on forced mode
    let effectiveApiBaseUrl = state.apiBaseUrl
    let effectiveIsLocalAvailable = state.isLocalAvailable

    if (forcedMode === "local" && localUrl) {
      effectiveApiBaseUrl = localUrl
      effectiveIsLocalAvailable = true
    } else if (forcedMode === "production") {
      effectiveApiBaseUrl = ""
      effectiveIsLocalAvailable = false
    }

    const controlsEnabled = effectiveIsLocalAvailable
    const isReadOnly = !effectiveIsLocalAvailable

    let statusLabel: string
    if (!state.isInitialized) {
      statusLabel = "Connecting..."
    } else if (forcedMode) {
      statusLabel =
        forcedMode === "local" ? "Local (Forced)" : "Live View (Forced)"
    } else if (effectiveIsLocalAvailable) {
      statusLabel = "Local Mode"
    } else {
      statusLabel = "Live View"
    }

    return {
      ...state,
      apiBaseUrl: effectiveApiBaseUrl,
      isLocalAvailable: effectiveIsLocalAvailable,
      checkConnectivity,
      forceLocal,
      forceProduction,
      resetToAuto,
      controlsEnabled,
      isReadOnly,
      statusLabel,
    }
  }, [
    state,
    forcedMode,
    localUrl,
    checkConnectivity,
    forceLocal,
    forceProduction,
    resetToAuto,
  ])

  return (
    <ConnectivityContext.Provider value={contextValue}>
      {children}
    </ConnectivityContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

export function useConnectivity(): ConnectivityContextValue {
  const context = useContext(ConnectivityContext)

  if (!context) {
    throw new Error(
      "useConnectivity must be used within a ConnectivityProvider"
    )
  }

  return context
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Get just the API base URL for making requests
 */
export function useApiBaseUrl(): string {
  const { apiBaseUrl } = useConnectivity()
  return apiBaseUrl
}

/**
 * Check if local instance is available
 */
export function useIsLocalAvailable(): boolean {
  const { isLocalAvailable } = useConnectivity()
  return isLocalAvailable
}

/**
 * Check if controls should be enabled (local mode active)
 */
export function useControlsEnabled(): boolean {
  const { controlsEnabled } = useConnectivity()
  return controlsEnabled
}

/**
 * Check if in read-only mode
 */
export function useIsReadOnly(): boolean {
  const { isReadOnly } = useConnectivity()
  return isReadOnly
}
