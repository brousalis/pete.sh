"use client"

import { useState, useEffect } from "react"
import { SonosPlayerComponent } from "./sonos-player"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import type { SonosPlayer } from "@/lib/types/sonos.types"
import { toast } from "sonner"

export function SonosControls() {
  const [players, setPlayers] = useState<SonosPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/sonos/players")
      if (!response.ok) {
        throw new Error("Failed to fetch players")
      }
      const data = await response.json()
      if (data.success && data.data) {
        setPlayers(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Sonos players")
      toast.error("Failed to load Sonos players")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Make sure Sonos HTTP API is running and configured in .env.local
        </p>
      </div>
    )
  }

  if (loading && players.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading Sonos players...</p>
        </div>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ">
        <p className="text-sm text-muted-foreground">No Sonos players found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Sonos Players</h2>
        <Button variant="ghost" size="sm" onClick={fetchPlayers} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <div className="space-y-4">
        {players.map((player) => (
          <SonosPlayerComponent key={player.uuid} player={player} />
        ))}
      </div>
    </div>
  )
}
