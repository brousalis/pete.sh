"use client"

import { Button } from "@/components/ui/button"
import { LiveBadge, ReadOnlyNotice } from "@/components/ui/live-badge"
import { useIsReadOnly } from "@/components/connectivity-provider"
import type { HueAllLightsStatus, HueScene, HueZone } from "@/lib/types/hue.types"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { AlertCircle, LayoutGrid, Lightbulb, List, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { HueQuickActions } from "./hue-quick-actions"
import { HueRoomCard } from "./hue-room-card"
import { HueSyncCard } from "./hue-sync-card"

type ViewMode = "grid" | "list"

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const isReadOnly = useIsReadOnly()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch zones, all scenes, and status in parallel
      const [zonesRes, scenesRes, statusRes] = await Promise.all([
        fetch("/api/hue/zones"),
        fetch("/api/hue/scenes"),
        fetch("/api/hue/all"),
      ])

      // Handle zones response
      if (!zonesRes.ok) {
        if (zonesRes.status === 400) {
          setError("HUE bridge not configured")
          return
        }
        throw new Error("Failed to fetch zones")
      }

      const zonesData = await zonesRes.json()
      if (zonesData.success && zonesData.data) {
        const zonesArray = Object.entries(zonesData.data)
          .map(([id, zone]) => ({
            ...(zone as HueZone),
            id,
          }))
          // Filter to Room and Zone types (exclude Entertainment, Luminaire, LightSource, etc.)
          .filter((z) => z.type === "Room" || z.type === "Zone")
          // Sort by priority
          .sort((a, b) => getRoomPriority(a.name) - getRoomPriority(b.name))

        setZones(zonesArray)

        // Fetch scenes for each zone
        const scenesPromises = zonesArray.map(async (zone) => {
          try {
            const res = await fetch(`/api/hue/zones/${zone.id}/scenes`)
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
      setError(err instanceof Error ? err.message : "Failed to load HUE data")
      toast.error("Failed to load HUE data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchData])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="size-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground">{error}</p>
              <p className="text-sm text-muted-foreground">
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
      <div className="space-y-6">
        {/* Loading skeleton for quick actions */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Loading skeleton for rooms */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-12">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Lightbulb className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-foreground">No rooms found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure rooms in your Philips Hue app
        </p>
        <Button onClick={fetchData} variant="outline" className="mt-4 gap-2">
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Read-only notice for production mode */}
      <ReadOnlyNotice className="rounded-xl" />

      {/* Header with refresh and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
            <Lightbulb className="size-5 text-brand" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Lighting</h1>
            <p className="text-xs text-muted-foreground">
              {zones.length} rooms · {status?.totalLights || 0} lights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live badge for production mode */}
          <LiveBadge />

          {/* View mode toggle */}
          <div className="flex rounded-lg border bg-muted/50 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <List className="size-4" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        className="rounded-2xl border bg-card p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <HueQuickActions
          status={status}
          scenes={allScenes}
          onRefresh={fetchData}
          favoriteSceneNames={["pete red", "pete work"]}
          isReadOnly={isReadOnly}
        />
      </motion.div>

      {/* Room Cards */}
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid"
            ? "md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 max-w-2xl"
        )}
      >
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
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

      {/* Hue Sync for Office */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <HueSyncCard areaName="office" onUpdate={fetchData} isReadOnly={isReadOnly} />
      </motion.div>

    </div>
  )
}
