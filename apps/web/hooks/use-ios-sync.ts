'use client'

import { useCallback, useEffect, useState } from 'react'

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        petehome?: {
          postMessage: (message: { action: string }) => void
        }
      }
    }
  }
}

export function useIOSSync() {
  const [isIOSApp, setIsIOSApp] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Check if running in iOS app
    setIsIOSApp(window.webkit?.messageHandlers?.petehome !== undefined)
  }, [])

  const openSyncSheet = useCallback(() => {
    if (!isIOSApp) return
    window.webkit?.messageHandlers?.petehome?.postMessage({
      action: 'openSyncSheet',
    })
  }, [isIOSApp])

  const syncNow = useCallback(async () => {
    if (!isIOSApp) return
    setIsSyncing(true)
    try {
      window.webkit?.messageHandlers?.petehome?.postMessage({ action: 'syncNow' })
      // Give visual feedback for a moment
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } finally {
      setIsSyncing(false)
    }
  }, [isIOSApp])

  const syncAll = useCallback(async () => {
    if (!isIOSApp) return
    setIsSyncing(true)
    try {
      window.webkit?.messageHandlers?.petehome?.postMessage({ action: 'syncAll' })
      // Give visual feedback for a moment
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } finally {
      setIsSyncing(false)
    }
  }, [isIOSApp])

  return {
    isIOSApp,
    isSyncing,
    openSyncSheet,
    syncNow,
    syncAll,
  }
}
