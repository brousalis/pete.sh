"use client"

import { useState, useEffect } from "react"
import { SonosNowPlaying } from "./sonos-now-playing"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { RefreshCw, AlertCircle, Volume2, VolumeX } from "lucide-react"
import type { SonosPlayer, SonosState } from "@/lib/types/sonos.types"
import { toast } from "sonner"

interface SonosPlayerProps {
  player: SonosPlayer
}

export function SonosPlayerComponent({ player }: SonosPlayerProps) {
  const [state, setState] = useState<SonosState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(50)

  const fetchState = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/sonos/players/${player.uuid}/state`)
      if (!response.ok) throw new Error("Failed to fetch player state")
      const data = await response.json()
      if (data.success && data.data) {
        setState(data.data)
        setVolume(data.data.volume)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load player state")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [player.uuid])

  const handlePlay = async () => {
    try {
      const response = await fetch(`/api/sonos/players/${player.uuid}/play`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to play")
      await fetchState()
      toast.success("Playing")
    } catch (error) {
      toast.error("Failed to play")
    }
  }

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/sonos/players/${player.uuid}/pause`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to pause")
      await fetchState()
      toast.success("Paused")
    } catch (error) {
      toast.error("Failed to pause")
    }
  }

  const handleVolumeChange = async (newVolume: number[]) => {
    const vol = newVolume[0]
    setVolume(vol)
    try {
      const response = await fetch(`/api/sonos/players/${player.uuid}/volume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: vol }),
      })
      if (!response.ok) throw new Error("Failed to set volume")
    } catch (error) {
      toast.error("Failed to set volume")
      fetchState() // Revert to actual volume
    }
  }

  if (loading && !state) {
    return (
      <div className="rounded-xl bg-background p-4 ring-1 ring-border">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading {player.roomName}...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-background p-4 ring-1 ring-border">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!state) {
    return null
  }

  return (
    <div className="space-y-4 rounded-xl bg-background p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{player.roomName}</h3>
        <Button variant="ghost" size="sm" onClick={fetchState} className="gap-2">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <SonosNowPlaying state={state} onPlay={handlePlay} onPause={handlePause} />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {state.mute ? (
            <VolumeX className="size-4 text-muted-foreground" />
          ) : (
            <Volume2 className="size-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">Volume: {volume}%</span>
        </div>
        <Slider
          value={[volume]}
          onValueChange={handleVolumeChange}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  )
}
