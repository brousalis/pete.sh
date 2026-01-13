"use client"

import { useState, useEffect } from "react"
import { Music, Play, Pause, Volume2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { SonosPlayer, SonosState } from "@/lib/types/sonos.types"
import { toast } from "sonner"

export function DeckMusic() {
  const [players, setPlayers] = useState<SonosPlayer[]>([])
  const [activePlayer, setActivePlayer] = useState<SonosPlayer | null>(null)
  const [state, setState] = useState<SonosState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(50)

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/sonos/players")
      if (!response.ok) throw new Error("Failed to fetch players")
      const data = await response.json()
      if (data.success && data.data) {
        setPlayers(data.data)
        // Auto-select first player or one that's playing
        const playing = data.data.find((p: SonosPlayer) => p.state?.playbackState === "PLAYING")
        const selected = playing || data.data[0] || null
        setActivePlayer(selected)
        if (selected) {
          fetchPlayerState(selected.uuid)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayerState = async (playerId: string) => {
    try {
      const response = await fetch(`/api/sonos/players/${playerId}/state`)
      if (!response.ok) throw new Error("Failed to fetch state")
      const data = await response.json()
      if (data.success && data.data) {
        setState(data.data)
        setVolume(data.data.volume)
      }
    } catch (err) {
      console.error("Failed to fetch player state", err)
    }
  }

  useEffect(() => {
    fetchPlayers()
    const interval = setInterval(() => {
      if (activePlayer) {
        fetchPlayerState(activePlayer.uuid)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [activePlayer])

  const handlePlayPause = async () => {
    if (!activePlayer) return
    try {
      const action = state?.playbackState === "PLAYING" ? "pause" : "play"
      const response = await fetch(`/api/sonos/players/${activePlayer.uuid}/${action}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error(`Failed to ${action}`)
      await fetchPlayerState(activePlayer.uuid)
      toast.success(state?.playbackState === "PLAYING" ? "Paused" : "Playing")
    } catch (error) {
      toast.error("Failed to control playback")
    }
  }

  const handleVolumeChange = async (newVolume: number[]) => {
    if (!activePlayer) return
    const vol = newVolume[0]
    setVolume(vol)
    try {
      const response = await fetch(`/api/sonos/players/${activePlayer.uuid}/volume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: vol }),
      })
      if (!response.ok) throw new Error("Failed to set volume")
    } catch (error) {
      toast.error("Failed to set volume")
      fetchPlayerState(activePlayer.uuid)
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="size-5 text-destructive" />
          <div className="text-xs font-medium text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  const isPlaying = state?.playbackState === "PLAYING"
  const trackName = state?.currentTrack?.title || "No track"
  const artist = state?.currentTrack?.artist || ""

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg ring-1 ring-border">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`rounded-lg p-1.5 ${isPlaying ? "bg-green-500/20" : "bg-muted"}`}>
            <Music className={`size-4 ${isPlaying ? "text-green-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Music</div>
            {activePlayer && (
              <div className="text-xs text-muted-foreground">{activePlayer.roomName}</div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchPlayers}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] p-0 touch-manipulation"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex flex-1 flex-col space-y-1.5">
        <button
          onClick={handlePlayPause}
          className={`min-h-[44px] touch-manipulation w-full rounded-lg border-2 p-2 transition-all active:scale-95 ${
            isPlaying
              ? "border-green-500/50 bg-green-500/10"
              : "border-border bg-background/50"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            {isPlaying ? (
              <Pause className="size-4 text-foreground" />
            ) : (
              <Play className="size-4 text-foreground" />
            )}
            <span className="text-xs font-semibold text-foreground">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </div>
        </button>

        {trackName !== "No track" && (
          <div className="rounded-lg bg-background/50 p-1.5">
            <div className="truncate text-xs font-medium text-foreground">{trackName}</div>
            {artist && (
              <div className="truncate text-xs text-muted-foreground">{artist}</div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Volume2 className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Volume</span>
            <span className="text-xs font-semibold text-foreground">{volume}%</span>
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
    </div>
  )
}
