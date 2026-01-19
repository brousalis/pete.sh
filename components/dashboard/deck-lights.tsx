"use client"

import { useState, useEffect } from "react"
import { Lightbulb, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import type { HueZone } from "@/lib/types/hue.types"
import { toast } from "sonner"

export function DeckLights() {
  const [zones, setZones] = useState<HueZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [anyOn, setAnyOn] = useState(false)

  const fetchZones = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/hue/zones")
      if (!response.ok) {
        if (response.status === 400) {
          setError("Not configured")
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
        setAnyOn(zonesArray.some((z) => z.state.any_on))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  const handleToggleAll = async (on: boolean) => {
    try {
      const promises = zones.map((zone) =>
        fetch(`/api/hue/zones/${zone.id}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ on }),
        })
      )
      await Promise.all(promises)
      setAnyOn(on)
      toast.success(`All lights ${on ? "on" : "off"}`)
      await fetchZones()
    } catch (error) {
      toast.error("Failed to toggle lights")
    }
  }

  const handleToggleZone = async (zoneId: string, on: boolean) => {
    try {
      const response = await fetch(`/api/hue/zones/${zoneId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      })
      if (!response.ok) throw new Error("Failed to toggle zone")
      toast.success(`Zone ${on ? "on" : "off"}`)
      await fetchZones()
    } catch (error) {
      toast.error("Failed to toggle zone")
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="size-5 text-destructive" />
          <div className="text-xs font-medium text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  const activeZones = zones.filter((z) => z.state.any_on).length
  const totalZones = zones.length

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="rounded-lg bg-yellow-500/20 p-1.5">
            <Lightbulb className={`size-4 ${anyOn ? "text-yellow-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Lights</div>
            {!loading && (
              <div className="text-xs text-muted-foreground">
                {activeZones}/{totalZones} zones
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchZones}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex flex-1 flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">All Lights</span>
          <ToggleSwitch checked={anyOn} onCheckedChange={handleToggleAll} />
        </div>

        {zones.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {zones.slice(0, 4).map((zone) => (
              <button
                key={zone.id}
                onClick={() => handleToggleZone(zone.id, !zone.state.any_on)}
                className={`min-h-[44px] touch-manipulation rounded-lg border-2 p-2 text-center transition-all active:scale-95 ${
                  zone.state.any_on
                    ? "border-yellow-500/50 bg-yellow-500/10"
                    : "border-border bg-background/50"
                }`}
              >
                <div className="text-xs font-medium text-foreground">{zone.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {zone.lights.length} lights
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
