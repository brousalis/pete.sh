"use client"

/**
 * LiveBadge Component
 * Shows a badge indicating live view mode (production) with recording timestamp
 * 
 * Now uses dynamic connectivity detection - when local instance is reachable,
 * shows "Local Mode", otherwise shows "Live from Pete's"
 */

import { cn } from "@/lib/utils"
import { Radio, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useConnectivity } from "@/components/connectivity-provider"

interface LiveBadgeProps {
  className?: string
  /** Optional timestamp when data was last recorded */
  recordedAt?: string
  /** Show compact version (icon only) */
  compact?: boolean
  /** Show even in local mode (useful for debugging) */
  showAlways?: boolean
}

/**
 * Formats a relative time string (e.g., "2 minutes ago")
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return "just now"
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return `${diffDays}d ago`
  }
}

export function LiveBadge({ 
  className, 
  recordedAt, 
  compact = false,
  showAlways = false 
}: LiveBadgeProps) {
  const { isInitialized, isLocalAvailable, isChecking, statusLabel } = useConnectivity()

  // Don't show in local mode unless showAlways is true
  if (!showAlways && isLocalAvailable) {
    return null
  }

  if (!isInitialized) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          "bg-muted text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    )
  }

  const relativeTime = recordedAt ? formatRelativeTime(recordedAt) : null
  const isRemote = !isLocalAvailable

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          isRemote 
            ? "bg-red-500/10 text-red-500" 
            : "bg-green-500/10 text-green-500",
          className
        )}
        title={isRemote ? "Live from Pete's apartment" : "Connected to real devices"}
      >
        {isChecking ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Radio className="h-3 w-3 animate-pulse" />
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isRemote 
          ? "bg-red-500/10 text-red-500 border border-red-500/20" 
          : "bg-green-500/10 text-green-500 border border-green-500/20",
        className
      )}
    >
      {isRemote ? (
        <>
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          <span>Live from Pete&apos;s</span>
          {relativeTime && (
            <span className="text-muted-foreground">• {relativeTime}</span>
          )}
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>{statusLabel}</span>
        </>
      )}
    </div>
  )
}

/**
 * Connection status indicator for widgets
 */
export function ConnectionStatus({ 
  isConnected = true,
  className 
}: { 
  isConnected?: boolean
  className?: string 
}) {
  const { isLocalAvailable } = useConnectivity()

  // In remote mode, show "cached" instead of connected/disconnected
  if (!isLocalAvailable) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Cached Data</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {isConnected ? (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-green-600 dark:text-green-400">Connected</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-600 dark:text-red-400">Disconnected</span>
        </>
      )}
    </div>
  )
}

/**
 * Read-only notice banner for production mode
 */
export function ReadOnlyNotice({ className }: { className?: string }) {
  const { isInitialized, isLocalAvailable } = useConnectivity()

  if (!isInitialized || isLocalAvailable) {
    return null
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm",
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>
        You&apos;re viewing a live snapshot of Pete&apos;s smart home. Controls are disabled.
      </span>
    </div>
  )
}
