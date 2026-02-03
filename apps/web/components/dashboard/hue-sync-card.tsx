'use client'

import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/lib/api/client'
import type {
  HueEntertainmentArea,
  HueEntertainmentStatus,
} from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Monitor, RefreshCw, Square } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface HueSyncCardProps {
  /** Name to search for entertainment area (e.g., "office") */
  areaName?: string
  /** Or provide a specific area ID */
  areaId?: string
  /** Called when sync state changes */
  onUpdate?: () => Promise<void>
  /** When true, all controls are disabled (production mode) */
  isReadOnly?: boolean
  /** Compact single-row layout for embedding in main area */
  compact?: boolean
}

export function HueSyncCard({
  areaName,
  areaId,
  onUpdate,
  isReadOnly = false,
  compact = false,
}: HueSyncCardProps) {
  const [areas, setAreas] = useState<HueEntertainmentArea[]>([])
  const [selectedArea, setSelectedArea] = useState<HueEntertainmentArea | null>(
    null
  )
  const [status, setStatus] = useState<HueEntertainmentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const fetchAreas = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch all entertainment areas
      const response = await apiGet<HueEntertainmentArea[]>(
        '/api/hue/entertainment'
      )
      if (!response.success || !response.data) {
        setLoading(false)
        return
      }

      const areas = response.data
      if (Array.isArray(areas)) {
        setAreas(areas)

        // If we have an ID, use it directly
        if (areaId) {
          const found = areas.find((a: HueEntertainmentArea) => a.id === areaId)
          if (found) {
            setSelectedArea(found)
          }
        }
        // If we have a name preference, try to find it
        else if (areaName) {
          const found = areas.find((a: HueEntertainmentArea) =>
            a.name.toLowerCase().includes(areaName.toLowerCase())
          )
          if (found) {
            setSelectedArea(found)
          } else {
            // Fall back to first area
            const firstArea = areas[0]
            if (firstArea) {
              setSelectedArea(firstArea)
            }
          }
        }
        // Otherwise use the first area
        else {
          const firstArea = areas[0]
          if (firstArea) {
            setSelectedArea(firstArea)
          }
        }
      }
    } catch {
      // Silently fail - entertainment might not be configured
    } finally {
      setLoading(false)
    }
  }, [areaId, areaName])

  // Fetch status when selected area changes
  useEffect(() => {
    if (!selectedArea) return

    const fetchStatus = async () => {
      try {
        const statusData = await apiGet<HueEntertainmentStatus>(
          `/api/hue/entertainment/${selectedArea.id}`
        )
        if (statusData.success && statusData.data) {
          setStatus(statusData.data)
        }
      } catch {
        // Ignore status fetch errors
      }
    }

    fetchStatus()
  }, [selectedArea])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  // Poll for status changes (detect when Hue Sync app starts/stops)
  useEffect(() => {
    if (!selectedArea) return

    const pollStatus = async () => {
      try {
        const statusData = await apiGet<HueEntertainmentStatus>(
          `/api/hue/entertainment/${selectedArea.id}`
        )
        if (statusData.success && statusData.data) {
          setStatus(statusData.data)
        }
      } catch {
        // Ignore polling errors
      }
    }

    // Poll every 3 seconds to detect sync app changes
    const interval = setInterval(pollStatus, 3000)

    return () => clearInterval(interval)
  }, [selectedArea])

  const handleToggle = async (active: boolean) => {
    if (!selectedArea) return

    if (isReadOnly) {
      toast.error('Controls disabled in live view mode')
      return
    }

    setToggling(true)
    try {
      const responseData = await apiPost<
        { error?: { description?: string } }[]
      >(`/api/hue/entertainment/${selectedArea.id}`, { active })

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to toggle Hue Sync')
      }

      // Check for Hue API errors even on 200 response
      if (responseData.data && Array.isArray(responseData.data)) {
        const hueError = responseData.data.find(r => r?.error)
        if (hueError?.error) {
          throw new Error(hueError.error.description || 'Hue API error')
        }
      }

      setStatus(prev => (prev ? { ...prev, active } : { active }))
      toast.success(active ? 'Hue Sync started' : 'Hue Sync stopped')
      onUpdate?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to toggle Hue Sync'

      // Check if it's an authorization error
      if (message.includes('unauthorized') || message.includes('permissions')) {
        toast.error('Entertainment API requires special permissions', {
          description:
            "Your Hue API user needs to be created with 'generateclientkey: true'",
          duration: 8000,
        })
      } else {
        toast.error(message)
      }
    } finally {
      setToggling(false)
    }
  }

  // Loading state
  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 border-t pt-4">
          <div className="bg-muted size-6 animate-pulse rounded" />
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
        </div>
      )
    }
    return (
      <motion.div
        className="bg-card rounded-2xl border p-4 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-muted size-10 animate-pulse rounded-xl" />
          <div className="space-y-2">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-3 w-16 animate-pulse rounded" />
          </div>
        </div>
      </motion.div>
    )
  }

  // Show setup guidance if no entertainment areas exist
  if (areas.length === 0) {
    if (compact) return null
    return (
      <motion.div
        className="border-muted-foreground/30 bg-card overflow-hidden rounded-2xl border border-dashed shadow-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
              <Monitor className="size-5" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold">Hue Sync</h3>
              <p className="text-muted-foreground text-xs">Not configured</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            Create an Entertainment Area in the Philips Hue app to enable screen
            sync. Go to{' '}
            <span className="text-foreground font-medium">
              Settings → Entertainment Areas
            </span>{' '}
            in the Hue app.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAreas}
              className="gap-2 text-xs"
            >
              <RefreshCw className="size-3" />
              Check again
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  const isActive = status?.active || false
  const area = selectedArea

  // Compact inline row for embedding in main area
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3',
          isActive && 'relative'
        )}
      >
        {/* Subtle gradient glow when active */}
        {isActive && (
          <div className="pointer-events-none absolute -inset-4 -z-10 rounded-xl bg-gradient-to-r from-purple-500/5 via-transparent to-transparent" />
        )}

        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
                isActive
                  ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/25 text-purple-400 shadow-sm shadow-purple-500/10'
                  : 'bg-muted/60 text-muted-foreground'
              )}
            >
              <Monitor className="size-4" />
            </div>
            {isActive && (
              <motion.div
                className="absolute -inset-0.5 -z-10 rounded-lg bg-purple-500/20 blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-foreground/90 text-sm font-medium">
              Hue Sync
            </span>
            <span className="text-muted-foreground/70 truncate text-xs">
              {area?.name}
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'size-1.5 shrink-0 rounded-full transition-colors',
                  isActive
                    ? 'animate-pulse bg-green-500'
                    : 'bg-muted-foreground/30'
                )}
              />
              <span className="text-muted-foreground/60 text-[11px]">
                {isActive ? 'Syncing' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggle(false)}
            disabled={isReadOnly || toggling}
            className="text-muted-foreground h-7 gap-1.5 px-2.5 text-xs font-medium transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Square className="size-3" />
            Stop
          </Button>
        )}
      </div>
    )
  }

  return (
    <motion.div
      className={cn(
        'bg-card overflow-hidden rounded-2xl border shadow-sm transition-colors',
        isActive &&
          'border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl transition-all',
                isActive
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isActive ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Monitor className="size-5" />
                </motion.div>
              ) : (
                <Monitor className="size-5" />
              )}
            </div>
            <div>
              <h3 className="text-foreground font-semibold">Hue Sync</h3>
              {areas.length > 1 ? (
                <select
                  value={selectedArea?.id || ''}
                  onChange={e => {
                    const newArea = areas.find(a => a.id === e.target.value)
                    if (newArea) setSelectedArea(newArea)
                  }}
                  className="text-muted-foreground mt-0.5 w-full rounded border-none bg-transparent p-0 text-xs focus:ring-0 focus:outline-none"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {area?.name || 'Entertainment Area'}
                </p>
              )}
            </div>
          </div>

          {/* Only show stop button when active */}
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(false)}
              disabled={isReadOnly || toggling}
              className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <Square className="size-3" />
              Stop
            </Button>
          )}
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'size-2 rounded-full transition-colors',
                isActive
                  ? 'animate-pulse bg-green-500'
                  : 'bg-muted-foreground/30'
              )}
            />
            <span className="text-muted-foreground text-xs">
              {isActive ? 'Syncing with screen' : 'Waiting for Hue Sync app'}
            </span>
          </div>
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAreas}
              disabled={loading}
              className="text-muted-foreground h-6 gap-1 px-2 text-xs"
            >
              <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
            </Button>
          )}
        </div>

        {/* Info when not active */}
        {!isActive && (
          <p className="text-muted-foreground/70 mt-3 text-xs">
            Start sync from the Hue Sync desktop app. You can stop it here.
          </p>
        )}
      </div>
    </motion.div>
  )
}
