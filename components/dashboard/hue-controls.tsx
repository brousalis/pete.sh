"use client"

import { useState, useEffect } from "react"
import { HueZoneCard } from "./hue-zone-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import type { HueZone, HueScene } from "@/lib/types/hue.types"
import { toast } from "sonner"

export function HueControls() {
  const [zones, setZones] = useState<HueZone[]>([])
  const [scenes, setScenes] = useState<Record<string, HueScene[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchZones = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/hue/zones")
      if (!response.ok) {
        if (response.status === 400) {
          setError("HUE bridge not configured")
          return
        }
        throw new Error("Failed to fetch zones")
      }
      const data = await response.json()
      if (data.success && data.data) {
        const zonesArray = Object.entries(data.data).map(([id, zone]) => ({
          ...(zone as HueZone),
          id,
        }))
        setZones(zonesArray)

        // Fetch scenes for each zone
        const scenesPromises = zonesArray.map(async (zone) => {
          try {
            const scenesResponse = await fetch(`/api/hue/zones/${zone.id}/scenes`)
            if (scenesResponse.ok) {
              const scenesData = await scenesResponse.json()
              return { zoneId: zone.id, scenes: scenesData.success ? scenesData.data : [] }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HUE zones")
      toast.error("Failed to load HUE zones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  const handleToggle = async (zoneId: string, on: boolean) => {
    try {
      const response = await fetch(`/api/hue/zones/${zoneId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      })
      if (!response.ok) throw new Error("Failed to toggle zone")
      // Refresh zones to get updated state
      await fetchZones()
    } catch (error) {
      throw error
    }
  }

  const handleActivateScene = async (zoneId: string, sceneId: string) => {
    try {
      const response = await fetch(`/api/hue/zones/${zoneId}/scenes/${sceneId}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to activate scene")
      // Refresh zones to get updated state
      await fetchZones()
    } catch (error) {
      throw error
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Please configure your HUE bridge in .env.local
        </p>
      </div>
    )
  }

  if (loading && zones.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading HUE zones...</p>
        </div>
      </div>
    )
  }

  if (zones.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <p className="text-sm text-muted-foreground">No HUE zones found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">HUE Light Zones</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchZones}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {zones.map((zone) => (
          <HueZoneCard
            key={zone.id}
            zone={zone}
            scenes={scenes[zone.id] || []}
            onToggle={handleToggle}
            onActivateScene={handleActivateScene}
          />
        ))}
      </div>
    </div>
  )
}
