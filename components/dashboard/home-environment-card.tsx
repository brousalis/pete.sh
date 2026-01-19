'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw,
  Lightbulb,
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  AlertCircle,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { HueZone } from '@/lib/types/hue.types'
import type { SonosPlayer } from '@/lib/types/sonos.types'
import { toast } from 'sonner'

export function HomeEnvironmentCard() {
  const [zones, setZones] = useState<HueZone[]>([])
  const [zoneBrightness, setZoneBrightness] = useState<Record<string, number>>({})
  const [players, setPlayers] = useState<SonosPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [lightsError, setLightsError] = useState<string | null>(null)
  const [musicError, setMusicError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'lights' | 'music'>('lights')

  const fetchData = async () => {
    setLoading(true)

    // Fetch HUE zones
    try {
      const response = await fetch('/api/hue/zones')
      if (!response.ok) {
        if (response.status === 400) {
          setLightsError('HUE bridge not configured')
        }
      } else {
        const data = await response.json()
        if (data.success && data.data) {
          const zonesArray = Object.entries(data.data).map(([id, zone]) => ({
            ...(zone as HueZone),
            id,
          }))
          setZones(zonesArray)
          setLightsError(null)

          // Initialize brightness values
          const brightnessMap: Record<string, number> = {}
          zonesArray.forEach(zone => {
            // Default to 100% if on, 50% if off
            brightnessMap[zone.id] = zone.state?.any_on ? 100 : 50
          })
          setZoneBrightness(brightnessMap)
        }
      }
    } catch {
      setLightsError('Failed to load lights')
    }

    // Fetch Sonos players
    try {
      const response = await fetch('/api/sonos/players')
      if (!response.ok) {
        setMusicError('Failed to load Sonos')
      } else {
        const data = await response.json()
        if (data.success && data.data) {
          setPlayers(data.data)
          setMusicError(null)
        }
      }
    } catch {
      setMusicError('Failed to load music')
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleZone = async (zoneId: string, on: boolean) => {
    // Optimistic update
    setZones(prev =>
      prev.map(z =>
        z.id === zoneId
          ? { ...z, state: { ...z.state, any_on: on, all_on: on } }
          : z
      )
    )

    try {
      const response = await fetch(`/api/hue/zones/${zoneId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on }),
      })
      if (!response.ok) throw new Error()
    } catch {
      // Revert on error
      setZones(prev =>
        prev.map(z =>
          z.id === zoneId
            ? { ...z, state: { ...z.state, any_on: !on, all_on: !on } }
            : z
        )
      )
      toast.error('Failed to toggle lights')
    }
  }

  const handleBrightnessChange = async (zoneId: string, brightness: number) => {
    setZoneBrightness(prev => ({ ...prev, [zoneId]: brightness }))

    try {
      // Convert 0-100 to 0-254 for Hue API
      const hueBrightness = Math.round((brightness / 100) * 254)
      await fetch(`/api/hue/zones/${zoneId}/brightness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness: hueBrightness }),
      })
    } catch {
      // Silent fail for brightness - it's a frequent operation
    }
  }

  const handlePlayPause = async (roomName: string, isPlaying: boolean) => {
    try {
      const action = isPlaying ? 'pause' : 'play'
      const response = await fetch(`/api/sonos/${roomName}/${action}`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error()

      // Refresh players
      const playersRes = await fetch('/api/sonos/players')
      if (playersRes.ok) {
        const data = await playersRes.json()
        if (data.success) setPlayers(data.data)
      }
    } catch {
      toast.error('Failed to control playback')
    }
  }

  const handleSkip = async (roomName: string, direction: 'next' | 'previous') => {
    try {
      const response = await fetch(`/api/sonos/${roomName}/${direction}`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error()
    } catch {
      toast.error('Failed to skip track')
    }
  }

  const handleVolume = async (roomName: string, volume: number) => {
    try {
      await fetch(`/api/sonos/${roomName}/volume/${volume}`, { method: 'POST' })
    } catch {
      toast.error('Failed to set volume')
    }
  }

  // Count active zones
  const activeZones = zones.filter(z => z.state?.any_on).length
  const playingRooms = players.filter(p => p.state?.playbackState === 'PLAYING').length

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab('lights')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'lights'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lightbulb className="size-4" />
            Lights
            {activeZones > 0 && (
              <span className="rounded-full bg-brand/20 px-1.5 text-xs text-brand">
                {activeZones}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'music'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Music className="size-4" />
            Music
            {playingRooms > 0 && (
              <span className="rounded-full bg-green-500/20 px-1.5 text-xs text-green-600">
                {playingRooms}
              </span>
            )}
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Lights Tab */}
      {activeTab === 'lights' && (
        <div className="space-y-2">
          {lightsError ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 p-6 text-center">
              <AlertCircle className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{lightsError}</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 p-6 text-center">
              <Lightbulb className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No light zones found</p>
            </div>
          ) : (
            zones.map(zone => {
              const isOn = zone.state?.any_on
              const brightness = zoneBrightness[zone.id] ?? 50

              return (
                <div
                  key={zone.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                    isOn
                      ? 'border-brand/30 bg-brand/5'
                      : 'border-border bg-card/50'
                  }`}
                >
                  {/* Toggle */}
                  <Switch
                    checked={isOn}
                    onCheckedChange={checked => handleToggleZone(zone.id, checked)}
                  />

                  {/* Zone Name */}
                  <span className={`min-w-[80px] text-sm font-medium ${isOn ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {zone.name}
                  </span>

                  {/* Brightness Slider */}
                  <div className="flex flex-1 items-center gap-2">
                    <Sun className={`size-3.5 ${isOn ? 'text-brand' : 'text-muted-foreground/50'}`} />
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => handleBrightnessChange(zone.id, v ?? 50)}
                      min={1}
                      max={100}
                      step={5}
                      disabled={!isOn}
                      className="flex-1"
                    />
                    <span className={`w-8 text-right text-xs tabular-nums ${isOn ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                      {brightness}%
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Music Tab */}
      {activeTab === 'music' && (
        <div className="space-y-3">
          {musicError ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 p-6 text-center">
              <AlertCircle className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{musicError}</p>
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 p-6 text-center">
              <Music className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No Sonos players found</p>
            </div>
          ) : (
            players.map(player => {
              const isPlaying = player.state?.playbackState === 'PLAYING'
              const currentTrack = player.state?.currentTrack

              return (
                <div
                  key={player.uuid}
                  className={`rounded-xl border p-4 transition-all ${
                    isPlaying
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border bg-card/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Album Art or Icon */}
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${
                        isPlaying ? 'bg-green-500/20' : 'bg-muted'
                      }`}
                    >
                      {currentTrack?.albumArtUri ? (
                        <img
                          src={currentTrack.albumArtUri}
                          alt="Album art"
                          className="size-12 rounded-lg object-cover"
                        />
                      ) : (
                        <Music
                          className={`size-5 ${
                            isPlaying ? 'text-green-500' : 'text-muted-foreground'
                          }`}
                        />
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{player.roomName}</span>
                        {isPlaying && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <span className="relative flex size-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                            </span>
                            Playing
                          </span>
                        )}
                      </div>
                      {currentTrack && (
                        <div className="mt-0.5">
                          <p className="truncate text-sm text-foreground">
                            {currentTrack.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {currentTrack.artist}
                          </p>
                        </div>
                      )}

                      {/* Controls */}
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handleSkip(player.roomName, 'previous')}
                        >
                          <SkipBack className="size-4" />
                        </Button>
                        <Button
                          variant={isPlaying ? 'default' : 'outline'}
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handlePlayPause(player.roomName, isPlaying)}
                        >
                          {isPlaying ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handleSkip(player.roomName, 'next')}
                        >
                          <SkipForward className="size-4" />
                        </Button>

                        {/* Volume */}
                        <div className="ml-2 flex flex-1 items-center gap-2">
                          <Volume2 className="size-4 text-muted-foreground" />
                          <Slider
                            value={[player.state?.volume || 20]}
                            onValueChange={([v]) => handleVolume(player.roomName, v ?? 20)}
                            min={0}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
