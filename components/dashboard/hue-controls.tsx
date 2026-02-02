'use client'

import {
  useConnectivity,
  useIsReadOnly,
} from '@/components/connectivity-provider'
import { Button } from '@/components/ui/button'
import { LiveBadge, ReadOnlyNotice } from '@/components/ui/live-badge'
import type {
  HueAllLightsStatus,
  HueScene,
  HueZone,
} from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  LayoutGrid,
  Lightbulb,
  List,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HueQuickActions } from './hue-quick-actions'
import { HueRoomCard } from './hue-room-card'
import { HueSyncCard } from './hue-sync-card'

type ViewMode = 'grid' | 'list'

// Room type priority for sorting
const ROOM_PRIORITY: Record<string, number> = {
  office: 1,
  living: 2,
  kitchen: 3,
  bedroom: 4,
  bathroom: 5,
}

function getRoomPriority(name: string): number {
  const n = name.toLowerCase()
  for (const [key, priority] of Object.entries(ROOM_PRIORITY)) {
    if (n.includes(key)) return priority
  }
  return 99
}

export function HueControls() {
  const [zones, setZones] = useState<HueZone[]>([])
  const [scenes, setScenes] = useState<Record<string, HueScene[]>>({})
  const [allScenes, setAllScenes] = useState<HueScene[]>([])
  const [status, setStatus] = useState<HueAllLightsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const isReadOnly = useIsReadOnly()
  const { apiBaseUrl, isInitialized } = useConnectivity()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch zones, all scenes, and status in parallel
      const [zonesRes, scenesRes, statusRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/hue/zones`),
        fetch(`${apiBaseUrl}/api/hue/scenes`),
        fetch(`${apiBaseUrl}/api/hue/all`),
      ])

      // Handle zones response
      if (!zonesRes.ok) {
        if (zonesRes.status === 400) {
          setError('HUE bridge not configured')
          return
        }
        throw new Error('Failed to fetch zones')
      }

      const zonesData = await zonesRes.json()
      if (zonesData.success && zonesData.data) {
        const zonesArray = Object.entries(zonesData.data)
          .map(([id, zone]) => ({
            ...(zone as HueZone),
            id,
          }))
          // Filter to Room and Zone types (exclude Entertainment, Luminaire, LightSource, etc.)
          .filter(z => z.type === 'Room' || z.type === 'Zone')
          // Sort by priority
          .sort((a, b) => getRoomPriority(a.name) - getRoomPriority(b.name))

        setZones(zonesArray)

        // Fetch scenes for each zone
        const scenesPromises = zonesArray.map(async zone => {
          try {
            const res = await fetch(
              `${apiBaseUrl}/api/hue/zones/${zone.id}/scenes`
            )
            if (res.ok) {
              const data = await res.json()
              return {
                zoneId: zone.id,
                scenes: data.success ? data.data : [],
              }
            }
            return { zoneId: zone.id, scenes: [] }
          } catch {
            return { zoneId: zone.id, scenes: [] }
          }
        })

        const scenesResults = await Promise.all(scenesPromises)
        const scenesMap: Record<string, HueScene[]> = {}
        scenesResults.forEach(({ zoneId, scenes: zoneScenes }) => {
          scenesMap[zoneId] = zoneScenes
        })
        setScenes(scenesMap)
      }

      // Handle all scenes response
      if (scenesRes.ok) {
        const scenesData = await scenesRes.json()
        if (scenesData.success && scenesData.data) {
          setAllScenes(scenesData.data)
        }
      }

      // Handle status response
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.success && statusData.data) {
          setStatus(statusData.data)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HUE data')
      toast.error('Failed to load HUE data')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    // Wait for connectivity to be initialized before fetching
    if (isInitialized) {
      fetchData()
    }
  }, [fetchData, isInitialized])

  // Auto-refresh every 30 seconds when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="border-destructive/20 bg-destructive/5 rounded-2xl border p-6">
          <div className="flex items-center gap-4">
            <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-xl">
              <AlertCircle className="text-destructive size-6" />
            </div>
            <div>
              <p className="text-foreground font-semibold">{error}</p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Please configure your HUE bridge in .env.local
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && zones.length === 0) {
    return (
      <div className="space-y-5">
        {/* Loading skeleton for combined header + quick actions card */}
        <div className="bg-card border-border/60 overflow-hidden rounded-2xl border">
          {/* Header row skeleton */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-muted size-9 animate-pulse rounded-xl" />
              <div className="space-y-1.5">
                <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                <div className="bg-muted h-3 w-28 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-muted h-7 w-16 animate-pulse rounded-lg" />
              <div className="bg-muted h-7 w-16 animate-pulse rounded-lg" />
            </div>
          </div>
          {/* Quick actions skeleton */}
          <div className="border-border/40 border-t px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted/50 h-5 w-px" />
              <div className="flex gap-1.5">
                <div className="bg-muted h-7 w-16 animate-pulse rounded-lg" />
                <div className="bg-muted h-7 w-16 animate-pulse rounded-lg" />
              </div>
              <div className="bg-muted/50 h-5 w-px" />
              <div className="flex gap-1.5">
                <div className="bg-muted h-7 w-20 animate-pulse rounded-lg" />
                <div className="bg-muted h-7 w-24 animate-pulse rounded-lg" />
                <div className="bg-muted h-7 w-20 animate-pulse rounded-lg" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="bg-muted h-3 w-12 animate-pulse rounded" />
              <div className="flex gap-1">
                <div className="bg-muted h-7 w-14 animate-pulse rounded-lg" />
                <div className="bg-muted h-7 w-16 animate-pulse rounded-lg" />
                <div className="bg-muted h-7 w-14 animate-pulse rounded-lg" />
              </div>
              <div className="bg-muted/50 h-5 w-px" />
              <div className="bg-muted h-2 flex-1 animate-pulse rounded-full" />
              <div className="bg-muted h-4 w-8 animate-pulse rounded" />
            </div>
          </div>
          {/* Hue sync skeleton */}
          <div className="border-border/40 bg-muted/5 border-t px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Loading skeleton for rooms */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="bg-muted/30 h-48 animate-pulse rounded-2xl"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (zones.length === 0) {
    return (
      <div className="bg-card flex flex-col items-center justify-center rounded-2xl border p-16">
        <div className="bg-muted flex size-20 items-center justify-center rounded-2xl">
          <Lightbulb className="text-muted-foreground size-10" />
        </div>
        <h3 className="text-foreground mt-6 text-xl font-semibold">
          No rooms found
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Configure rooms in your Philips Hue app
        </p>
        <Button onClick={fetchData} variant="outline" className="mt-6 gap-2">
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Read-only notice for production mode */}
      <ReadOnlyNotice className="rounded-xl" />

      {/* Combined Header + Quick Actions Card */}
      <motion.div
        className="bg-card border-border/60 overflow-hidden rounded-2xl border"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-brand/15 flex size-9 items-center justify-center rounded-xl">
              <Lightbulb className="text-brand size-[18px]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-foreground text-base font-semibold">
                Lighting
              </h1>
              <p className="text-muted-foreground text-xs">
                {zones.length} rooms · {status?.totalLights || 0} lights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <LiveBadge />

            <div className="border-border/50 bg-muted/40 flex rounded-lg border p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-1.5 transition-all',
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-1.5 transition-all',
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Actions - Compact */}
        <div className="border-border/40 border-t px-4 py-3">
          <HueQuickActions
            status={status}
            scenes={allScenes}
            onRefresh={fetchData}
            favoriteSceneNames={['pete red', 'pete work', 'purple rain']}
            isReadOnly={isReadOnly}
            brightnessZoneId={
              zones.find(z => z.name.toLowerCase().includes('office'))?.id
            }
            brightnessZoneName="Office"
          />
        </div>

        {/* Hue Sync Row */}
        <div className="border-border/40 bg-muted/5 border-t px-4 py-2.5">
          <HueSyncCard
            areaName="office"
            onUpdate={fetchData}
            isReadOnly={isReadOnly}
            compact
          />
        </div>
      </motion.div>

      {/* Room Cards */}
      <div
        className={cn(
          'grid gap-4',
          viewMode === 'grid'
            ? 'md:grid-cols-2 lg:grid-cols-3'
            : 'max-w-2xl grid-cols-1'
        )}
      >
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
          >
            <HueRoomCard
              zone={zone}
              scenes={scenes[zone.id] || []}
              onUpdate={fetchData}
              isReadOnly={isReadOnly}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
