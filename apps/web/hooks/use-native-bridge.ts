'use client'

import { useEffect, useState } from 'react'

interface SyncStatus {
  lastSync: string
  inProgress: boolean
  error: string
}

export interface NativeBridge {
  isNative: boolean
  syncStatus: SyncStatus | null
  openSync: () => void
  openSettings: () => void
  syncNow: () => void
  syncAll: () => void
}

type PetehomeBridgeWindow = Window & {
  webkit?: {
    messageHandlers?: {
      petehome?: { postMessage: (msg: { action: string }) => void }
    }
  }
}

function postBridgeMessage(action: string) {
  ;(window as PetehomeBridgeWindow).webkit?.messageHandlers?.petehome?.postMessage({ action })
}

function isBridgeAvailable(): boolean {
  return !!(window as PetehomeBridgeWindow).webkit?.messageHandlers?.petehome
}

export function useNativeBridge(): NativeBridge {
  const [isNative, setIsNative] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)

  useEffect(() => {
    setIsNative(isBridgeAvailable())

    function handleSyncEvent(event: Event) {
      setSyncStatus((event as CustomEvent<SyncStatus>).detail)
    }

    window.addEventListener('petehome:sync', handleSyncEvent)
    return () => window.removeEventListener('petehome:sync', handleSyncEvent)
  }, [])

  return {
    isNative,
    syncStatus,
    openSync: () => postBridgeMessage('openSync'),
    openSettings: () => postBridgeMessage('openSettings'),
    syncNow: () => postBridgeMessage('syncNow'),
    syncAll: () => postBridgeMessage('syncAll'),
  }
}
