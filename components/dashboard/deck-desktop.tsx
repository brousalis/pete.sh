"use client"

import { useState, useEffect } from "react"
import { Monitor, Volume2, Cpu, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { isLocalhost } from "@/lib/config"
import type { PerformanceMetrics, VolumeState } from "@/lib/types/desktop.types"
import { toast } from "sonner"

export function DeckDesktop() {
  const [volume, setVolume] = useState<VolumeState | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    setAvailable(isLocalhost || typeof window !== "undefined")
    if (available) {
      fetchData()
    }
  }, [available])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [volResponse, perfResponse] = await Promise.all([
        fetch("/api/desktop/volume").catch(() => null),
        fetch("/api/desktop/performance").catch(() => null),
      ])

      if (volResponse?.ok) {
        const volData = await volResponse.json()
        if (volData.success) {
          setVolume(volData.data)
        }
      }

      if (perfResponse?.ok) {
        const perfData = await perfResponse.json()
        if (perfData.success) {
          setPerformance(perfData.data)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  const handleVolumeChange = async (newVolume: number[]) => {
    const vol = newVolume[0] ?? 0
    setVolume((prev) => (prev ? { ...prev, volume: vol } : { volume: vol, muted: false }))
    try {
      const response = await fetch("/api/desktop/volume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: vol }),
      })
      if (!response.ok) throw new Error("Failed to set volume")
    } catch (error) {
      toast.error("Failed to set volume")
      fetchData()
    }
  }

  const handleSwitchDisplay = async () => {
    try {
      const response = await fetch("/api/desktop/display/switch", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to switch display")
      toast.success("Display switched")
    } catch (error) {
      toast.error("Failed to switch display")
    }
  }

  if (!available) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-lg ">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Monitor className="size-6 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">Not available</div>
        </div>
      </div>
    )
  }

  if (error && !volume && !performance) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-lg ">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <div className="text-xs font-medium text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-card/80 p-4 shadow-lg ">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/20 p-2">
            <Monitor className="size-5 text-blue-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">Desktop</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {volume && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Volume</span>
              <span className="text-xs font-semibold text-foreground">{volume.volume}%</span>
            </div>
            <Slider
              value={[volume.volume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {performance && (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-background/50 p-2">
            <div className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">CPU</div>
                <div className="text-sm font-semibold text-foreground">
                  {Math.round(performance.cpu.usage)}%
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Memory</div>
              <div className="text-sm font-semibold text-foreground">
                {Math.round(performance.memory.usage)}%
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSwitchDisplay}
          className="w-full rounded-lg border-2 border-border bg-background/50 p-2.5 transition-all hover:bg-background"
        >
          <div className="flex items-center justify-center gap-2">
            <Monitor className="size-4 text-foreground" />
            <span className="text-xs font-semibold text-foreground">Switch Display</span>
          </div>
        </button>
      </div>
    </div>
  )
}
