"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { HueAllLightsStatus, HueScene, HueZone } from "@/lib/types/hue.types"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Briefcase,
  Lightbulb,
  Moon,
  Monitor,
  Palette,
  Power,
  RefreshCw,
  Square,
  Sun,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { HueCompactRoom } from "./hue-compact-room"

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
  const [brightness, setBrightness] = useState(127)
  const [syncStatus, setSyncStatus] = useState<{ active: boolean; areaId?: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch zones, all scenes, status, and entertainment in parallel
      const [zonesRes, scenesRes, statusRes, entertainmentRes] = await Promise.all([
        fetch("/api/hue/zones"),
        fetch("/api/hue/scenes"),
        fetch("/api/hue/all"),
        fetch("/api/hue/entertainment"),
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
          .filter((z) => z.type === "Room" || z.type === "Zone")
          .sort((a, b) => getRoomPriority(a.name) - getRoomPriority(b.name))

        setZones(zonesArray)

        // Fetch scenes for each zone
        const scenesPromises = zonesArray.map(async (zone) => {
          try {
            const res = await fetch(`/api/hue/zones/${zone.id}/scenes`)
            if (res.ok) {
              const data = await res.json()
              return { zoneId: zone.id, scenes: data.success ? data.data : [] }
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
          if (statusData.data.averageBrightness) {
            setBrightness(statusData.data.averageBrightness)
          }
        }
      }

      // Handle entertainment areas
      if (entertainmentRes.ok) {
        const entertainmentData = await entertainmentRes.json()
        if (entertainmentData.success && entertainmentData.data?.length > 0) {
          const area = entertainmentData.data[0]
          // Fetch status for this area
          const statusRes2 = await fetch(`/api/hue/entertainment/${area.id}`)
          if (statusRes2.ok) {
            const statusData2 = await statusRes2.json()
            if (statusData2.success) {
              setSyncStatus({ active: statusData2.data.active, areaId: area.id })
            }
          }
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

  // Poll sync status every 3 seconds
  useEffect(() => {
    if (!syncStatus?.areaId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/hue/entertainment/${syncStatus.areaId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setSyncStatus((prev) => prev ? { ...prev, active: data.data.active } : null)
          }
        }
      } catch {
        // Ignore
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [syncStatus?.areaId])

  // Find favorite scenes
  const favoriteScenes = allScenes.filter((scene) =>
    ["pete red", "pete work"].some((name) =>
      scene.name.toLowerCase().includes(name.toLowerCase())
    )
  )

  const handleToggleAll = async (on: boolean) => {
    try {
      const response = await fetch("/api/hue/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      })
      if (!response.ok) throw new Error("Failed to toggle lights")
      toast.success(on ? "All lights on" : "All lights off")
      await fetchData()
    } catch {
      toast.error("Failed to toggle lights")
    }
  }

  const handleBrightnessCommit = async (values: number[]) => {
    const value = values[0]
    try {
      const response = await fetch("/api/hue/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: true, brightness: value }),
      })
      if (!response.ok) throw new Error("Failed to set brightness")
      await fetchData()
    } catch {
      toast.error("Failed to set brightness")
    }
  }

  const handleActivateScene = async (scene: HueScene) => {
    if (!scene.group) return
    try {
      const response = await fetch(`/api/hue/zones/${scene.group}/scenes/${scene.id}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to activate scene")
      toast.success(scene.name)
      await fetchData()
    } catch {
      toast.error("Failed to activate scene")
    }
  }

  const handleStopSync = async () => {
    if (!syncStatus?.areaId) return
    try {
      const response = await fetch(`/api/hue/entertainment/${syncStatus.areaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      })
      if (!response.ok) throw new Error("Failed to stop sync")
      setSyncStatus((prev) => prev ? { ...prev, active: false } : null)
      toast.success("Hue Sync stopped")
    } catch {
      toast.error("Failed to stop sync")
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-destructive" />
          <div>
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs text-muted-foreground">Configure HUE bridge in .env.local</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading && zones.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    )
  }

  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-8">
        <Lightbulb className="size-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No rooms found</p>
        <Button onClick={fetchData} variant="outline" size="sm" className="mt-3">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 sm:gap-3 sm:p-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              status?.anyOn ? "bg-brand/20 text-brand" : "bg-muted text-muted-foreground"
            )}
          >
            <Power className="size-4" />
          </div>
          <div className="text-sm">
            <span className="font-medium">{status?.lightsOn || 0}</span>
            <span className="text-muted-foreground">/{status?.totalLights || 0}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* All On/Off */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(true)}
            disabled={status?.allOn}
            className="h-8 gap-1.5 px-3"
          >
            <Sun className="size-3.5" />
            On
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(false)}
            disabled={!status?.anyOn}
            className="h-8 gap-1.5 px-3"
          >
            <Moon className="size-3.5" />
            Off
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Quick Scenes */}
        {favoriteScenes.map((scene) => (
          <Button
            key={scene.id}
            variant="outline"
            size="sm"
            onClick={() => handleActivateScene(scene)}
            className={cn(
              "h-8 gap-1.5 px-3",
              scene.name.toLowerCase().includes("red")
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            )}
          >
            {scene.name.toLowerCase().includes("red") ? (
              <Palette className="size-3.5" />
            ) : (
              <Briefcase className="size-3.5" />
            )}
            {scene.name}
          </Button>
        ))}

        {/* Brightness Slider */}
        {status?.anyOn && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex flex-1 items-center gap-2 min-w-[120px] max-w-[200px]">
              <Slider
                value={[brightness]}
                onValueChange={(v) => setBrightness(v[0] ?? 127)}
                onValueCommit={handleBrightnessCommit}
                min={1}
                max={254}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-xs tabular-nums text-muted-foreground">
                {Math.round((brightness / 254) * 100)}%
              </span>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Hue Sync Status */}
        {syncStatus && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5",
              syncStatus.active
                ? "bg-purple-500/10 text-purple-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Monitor className="size-4" />
            <span className="text-xs font-medium">
              {syncStatus.active ? "Syncing" : "Sync"}
            </span>
            {syncStatus.active && (
              <button
                onClick={handleStopSync}
                className="ml-1 rounded p-0.5 hover:bg-purple-500/20"
              >
                <Square className="size-3" />
              </button>
            )}
          </div>
        )}

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Room Grid - 3 columns on tablet (iPad Mini), scales up on larger screens */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {zones.map((zone) => (
          <HueCompactRoom
            key={zone.id}
            zone={zone}
            scenes={scenes[zone.id] || []}
            onUpdate={fetchData}
          />
        ))}
      </div>
    </div>
  )
}
