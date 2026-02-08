'use client'

import {
  useConnectivity,
  useIsReadOnly,
} from '@/components/connectivity-provider'
import { Button } from '@/components/ui/button'
import { LiveBadge, ReadOnlyNotice } from '@/components/ui/live-badge'
import { Slider } from '@/components/ui/slider'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { apiPost } from '@/lib/api/client'
import type {
  HueAllLightsStatus,
  HueLight,
  HueScene,
  HueZone,
} from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  BedDouble,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Home,
  Lamp,
  Lightbulb,
  Monitor,
  Moon,
  Palette,
  Power,
  RefreshCw,
  ShowerHead,
  Sofa,
  Sparkles,
  Square,
  Sun,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HueLightItem } from './hue-light-item'
import { HueAnalyticsCompact } from './hue-analytics-compact'

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

function getRoomIcon(name: string, className?: string) {
  const n = name.toLowerCase()
  const cls = className || 'size-5'
  if (n.includes('living')) return <Sofa className={cls} />
  if (n.includes('kitchen')) return <UtensilsCrossed className={cls} />
  if (n.includes('bed')) return <BedDouble className={cls} />
  if (n.includes('bath')) return <ShowerHead className={cls} />
  if (n.includes('office')) return <Briefcase className={cls} />
  if (n.includes('gym') || n.includes('fitness'))
    return <Dumbbell className={cls} />
  if (n.includes('home') || n.includes('all')) return <Home className={cls} />
  return <Lamp className={cls} />
}

const presetBrightness = [
  { label: 'Dim', value: 32, icon: Moon },
  { label: 'Medium', value: 127, icon: Sparkles },
  { label: 'Bright', value: 254, icon: Sun },
]

export function HueControls() {
  const [zones, setZones] = useState<HueZone[]>([])
  const [scenes, setScenes] = useState<Record<string, HueScene[]>>({})
  const [allScenes, setAllScenes] = useState<HueScene[]>([])
  const [status, setStatus] = useState<HueAllLightsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(127)
  const [isTogglingAll, setIsTogglingAll] = useState(false)
  const [activatingScene, setActivatingScene] = useState<string | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const isReadOnly = useIsReadOnly()
  const { apiBaseUrl, isInitialized } = useConnectivity()

  // Hue Sync state
  const [syncStatus, setSyncStatus] = useState<{ active: boolean } | null>(null)
  const [syncArea, setSyncArea] = useState<{ id: string; name: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [zonesRes, scenesRes, statusRes, entertainmentRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/hue/zones`),
        fetch(`${apiBaseUrl}/api/hue/scenes`),
        fetch(`${apiBaseUrl}/api/hue/all`),
        fetch(`${apiBaseUrl}/api/hue/entertainment`).catch(() => null),
      ])

      if (!zonesRes.ok) {
        if (zonesRes.status === 400) {
          setError('HUE bridge not configured')
          return
        }
        throw new Error('Failed to fetch zones')
      }

      const zonesData = await zonesRes.json()
      if (zonesData.success && zonesData.data) {
        const allZones = Object.entries(zonesData.data)
          .map(([id, zone]) => ({
            ...(zone as HueZone),
            id,
          }))
          .filter(z => z.type === 'Room' || z.type === 'Zone')

        // Deduplicate by name - prefer 'Room' type over 'Zone' type
        const seenNames = new Map<string, HueZone & { id: string }>()
        for (const zone of allZones) {
          const normalizedName = zone.name.toLowerCase().trim()
          const existing = seenNames.get(normalizedName)
          if (!existing || (zone.type === 'Room' && existing.type === 'Zone')) {
            seenNames.set(normalizedName, zone)
          }
        }

        const zonesArray = Array.from(seenNames.values())
          .sort((a, b) => getRoomPriority(a.name) - getRoomPriority(b.name))

        setZones(zonesArray)

        const scenesPromises = zonesArray.map(async zone => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/hue/zones/${zone.id}/scenes`)
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

      if (scenesRes.ok) {
        const scenesData = await scenesRes.json()
        if (scenesData.success && scenesData.data) {
          setAllScenes(scenesData.data)
        }
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.success && statusData.data) {
          setStatus(statusData.data)
          if (statusData.data.averageBrightness) {
            setBrightness(statusData.data.averageBrightness)
          }
        }
      }

      if (entertainmentRes?.ok) {
        const entertainmentData = await entertainmentRes.json()
        if (entertainmentData.success && entertainmentData.data?.length > 0) {
          const area = entertainmentData.data.find((a: { name: string }) =>
            a.name.toLowerCase().includes('office')
          ) || entertainmentData.data[0]
          setSyncArea(area)

          const syncRes = await fetch(`${apiBaseUrl}/api/hue/entertainment/${area.id}`)
          if (syncRes.ok) {
            const syncData = await syncRes.json()
            if (syncData.success && syncData.data) {
              setSyncStatus(syncData.data)
            }
          }
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
    if (isInitialized) {
      fetchData()
    }
  }, [fetchData, isInitialized])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!syncArea) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/hue/entertainment/${syncArea.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setSyncStatus(data.data)
          }
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [syncArea, apiBaseUrl])

  // Handlers
  const handleToggleAll = async (on: boolean) => {
    if (isReadOnly) {
      toast.error('Controls disabled in live view mode')
      return
    }
    setIsTogglingAll(true)
    try {
      const response = await apiPost('/api/hue/all', { on })
      if (!response.success) throw new Error('Failed to toggle lights')
      toast.success(on ? 'All lights on' : 'All lights off')
      await fetchData()
    } catch {
      toast.error('Failed to toggle lights')
    } finally {
      setIsTogglingAll(false)
    }
  }

  const handleActivateScene = async (scene: HueScene) => {
    if (isReadOnly) {
      toast.error('Controls disabled in live view mode')
      return
    }
    if (!scene.group) {
      toast.error('Scene has no associated zone')
      return
    }
    setActivatingScene(scene.id)
    try {
      const response = await apiPost(`/api/hue/zones/${scene.group}/scenes/${scene.id}`)
      if (!response.success) throw new Error('Failed to activate scene')
      toast.success(`Activated: ${scene.name}`)
      await fetchData()
    } catch {
      toast.error('Failed to activate scene')
    } finally {
      setActivatingScene(null)
    }
  }

  const officeZone = zones.find(z => z.name.toLowerCase().includes('office'))

  const handleBrightnessPreset = async (value: number) => {
    if (isReadOnly || !officeZone) return
    setBrightness(value)
    try {
      const response = await apiPost(`/api/hue/zones/${officeZone.id}/brightness`, { brightness: value })
      if (!response.success) throw new Error('Failed to set brightness')
      await fetchData()
    } catch {
      toast.error('Failed to set brightness')
    }
  }

  const handleBrightnessCommit = async (values: number[]) => {
    if (isReadOnly || !officeZone) return
    const value = values[0]
    if (value === undefined) return
    try {
      const response = await apiPost(`/api/hue/zones/${officeZone.id}/brightness`, { brightness: value })
      if (!response.success) throw new Error('Failed to set brightness')
      await fetchData()
    } catch {
      toast.error('Failed to set brightness')
    }
  }

  const handleStopSync = async () => {
    if (!syncArea || isReadOnly) return
    try {
      await apiPost(`/api/hue/entertainment/${syncArea.id}`, { active: false })
      setSyncStatus({ active: false })
      toast.success('Hue Sync stopped')
    } catch {
      toast.error('Failed to stop Hue Sync')
    }
  }

  // Scene helpers
  const favoriteSceneNames = ['pete red', 'pete work', 'purple rain']
  const favoriteScenes = allScenes.filter(scene =>
    favoriteSceneNames.some(name => scene.name.toLowerCase().includes(name.toLowerCase()))
  )

  const getSceneStyles = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('red'))
      return 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
    if (n.includes('purple') || n.includes('rain'))
      return 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
    if (n.includes('work') || n.includes('concentrate'))
      return 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
    return 'bg-brand/20 text-brand hover:bg-brand/30'
  }

  const getSceneIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('red') || n.includes('relax')) return Palette
    if (n.includes('work') || n.includes('concentrate')) return Briefcase
    if (n.includes('bright') || n.includes('energize')) return Zap
    return Sparkles
  }

  const brightnessPercent = Math.round((brightness / 254) * 100)

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/20">
            <AlertCircle className="size-6 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{error}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Please configure your HUE bridge in .env.local
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading && zones.length === 0) {
    return <LoadingSkeleton />
  }

  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-white/5">
          <Lightbulb className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No rooms found</h3>
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

  // Split rooms into primary (first 2) and secondary (rest)
  const primaryRooms = zones.slice(0, 2)
  const secondaryRooms = zones.slice(2)

  return (
    <div className="space-y-6">
      <ReadOnlyNotice className="rounded-lg" />

      {/* ========== COMMAND BAR ========== */}
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand/15">
              <Lightbulb className="size-5 text-brand" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Lighting</h1>
                <LiveBadge />
              </div>
              <p className="text-sm text-muted-foreground">
                {zones.length} rooms · {status?.totalLights || 0} lights
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Control Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Power Status */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-lg transition-all',
                status?.anyOn ? 'bg-brand/20 text-brand' : 'bg-white/5 text-muted-foreground'
              )}
            >
              <Power className="size-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-semibold tabular-nums">
                {status?.lightsOn || 0}/{status?.totalLights || 0}
                <span className="ml-1 font-normal text-muted-foreground">
                  {status?.anyOn ? 'on' : 'off'}
                </span>
              </div>
              <div className="flex gap-1.5 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(true)}
                  disabled={isReadOnly || isTogglingAll || status?.allOn}
                  className="h-6 px-2 text-[11px]"
                >
                  All On
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAll(false)}
                  disabled={isReadOnly || isTogglingAll || !status?.anyOn}
                  className="h-6 px-2 text-[11px]"
                >
                  All Off
                </Button>
              </div>
            </div>
          </div>

          <div className="h-12 w-px bg-white/10 hidden sm:block" />

          {/* Quick Scenes */}
          {favoriteScenes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {favoriteScenes.map(scene => {
                const Icon = getSceneIcon(scene.name)
                return (
                  <button
                    key={scene.id}
                    onClick={() => handleActivateScene(scene)}
                    disabled={isReadOnly || activatingScene === scene.id}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      getSceneStyles(scene.name)
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="capitalize">{scene.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="h-12 w-px bg-white/10 hidden lg:block" />

          {/* Office Brightness */}
          {officeZone && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Office</span>
              <div className="flex gap-1">
                {presetBrightness.map(preset => {
                  const Icon = preset.icon
                  const isActive = Math.abs(brightness - preset.value) < 20 && status?.anyOn
                  return (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBrightnessPreset(preset.value)}
                      disabled={isReadOnly}
                      className={cn(
                        'h-7 gap-1 px-2 text-[11px]',
                        isActive && 'bg-white/10 text-foreground'
                      )}
                    >
                      <Icon className="size-3" />
                      {preset.label}
                    </Button>
                  )
                })}
              </div>
              {status?.anyOn && (
                <div className="flex items-center gap-2 w-32">
                  <Slider
                    value={[brightness]}
                    onValueChange={v => v[0] !== undefined && setBrightness(v[0])}
                    onValueCommit={handleBrightnessCommit}
                    min={1}
                    max={254}
                    step={1}
                    disabled={isReadOnly}
                    className="flex-1"
                  />
                  <span className="text-[11px] tabular-nums text-muted-foreground w-7">
                    {brightnessPercent}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Hue Sync */}
          {syncArea && (
            <>
              <div className="h-12 w-px bg-white/10 hidden xl:block" />
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md transition-all',
                    syncStatus?.active
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-white/5 text-muted-foreground'
                  )}
                >
                  <Monitor className="size-3.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">Sync</span>
                  <div
                    className={cn(
                      'size-1.5 rounded-full',
                      syncStatus?.active ? 'animate-pulse bg-green-500' : 'bg-white/20'
                    )}
                  />
                </div>
                {syncStatus?.active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStopSync}
                    disabled={isReadOnly}
                    className="h-6 gap-1 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Square className="size-2.5" />
                    Stop
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Primary Rooms - Larger cards */}
        {primaryRooms.map((zone, index) => (
          <motion.div
            key={zone.id}
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <RoomCard
              zone={zone}
              scenes={scenes[zone.id] || []}
              onUpdate={fetchData}
              isReadOnly={isReadOnly}
              apiBaseUrl={apiBaseUrl}
              size="large"
            />
          </motion.div>
        ))}

        {/* Analytics - Takes up one column on large screens */}
        <motion.div
          className="lg:col-span-1 lg:row-span-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <HueAnalyticsCompact className="h-full" />
        </motion.div>

        {/* Secondary Rooms - Smaller cards in remaining space */}
        {secondaryRooms.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 2) * 0.05 }}
          >
            <RoomCard
              zone={zone}
              scenes={scenes[zone.id] || []}
              onUpdate={fetchData}
              isReadOnly={isReadOnly}
              apiBaseUrl={apiBaseUrl}
              size="compact"
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// ROOM CARD
// ============================================

interface RoomCardProps {
  zone: HueZone
  scenes?: HueScene[]
  onUpdate?: () => Promise<void>
  isReadOnly?: boolean
  apiBaseUrl: string
  size?: 'large' | 'compact'
}

function RoomCard({
  zone,
  scenes = [],
  onUpdate,
  isReadOnly = false,
  apiBaseUrl,
  size = 'compact',
}: RoomCardProps) {
  const [on, setOn] = useState(zone.state.any_on)
  const [brightness, setBrightness] = useState(zone.action?.bri || 127)
  const [isUpdating, setIsUpdating] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [lights, setLights] = useState<HueLight[]>([])
  const [loadingLights, setLoadingLights] = useState(false)

  useEffect(() => {
    setOn(zone.state.any_on)
    if (zone.action?.bri) {
      setBrightness(zone.action.bri)
    }
  }, [zone.state.any_on, zone.action?.bri])

  useEffect(() => {
    if (expanded && lights.length === 0) {
      setLoadingLights(true)
      fetch(`${apiBaseUrl}/api/hue/zones/${zone.id}/lights`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setLights(data.data)
          }
        })
        .catch(() => toast.error('Failed to load lights'))
        .finally(() => setLoadingLights(false))
    }
  }, [expanded, zone.id, lights.length, apiBaseUrl])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (isReadOnly) {
        toast.error('Controls disabled in live view mode')
        return
      }
      setIsUpdating(true)
      setOn(checked)
      try {
        const response = await fetch(`${apiBaseUrl}/api/hue/zones/${zone.id}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ on: checked }),
        })
        if (!response.ok) throw new Error('Failed to toggle zone')
        onUpdate?.()
      } catch {
        setOn(!checked)
        toast.error(`Failed to toggle ${zone.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, zone.name, onUpdate, isReadOnly, apiBaseUrl]
  )

  const handleBrightnessChange = (values: number[]) => {
    if (isReadOnly) return
    if (values[0] !== undefined) {
      setBrightness(values[0])
    }
  }

  const handleBrightnessCommit = useCallback(
    async (values: number[]) => {
      if (isReadOnly) return
      const value = values[0]
      if (value === undefined) return
      setIsUpdating(true)
      try {
        const response = await fetch(`${apiBaseUrl}/api/hue/zones/${zone.id}/brightness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brightness: value }),
        })
        if (!response.ok) throw new Error('Failed to set brightness')
        setOn(true)
        onUpdate?.()
      } catch {
        toast.error(`Failed to adjust ${zone.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, zone.name, onUpdate, isReadOnly, apiBaseUrl]
  )

  const handleActivateScene = useCallback(
    async (sceneId: string, sceneName: string) => {
      if (isReadOnly) {
        toast.error('Controls disabled in live view mode')
        return
      }
      setIsUpdating(true)
      try {
        const response = await fetch(`${apiBaseUrl}/api/hue/zones/${zone.id}/scenes/${sceneId}`, {
          method: 'POST',
        })
        if (!response.ok) throw new Error('Failed to activate scene')
        setOn(true)
        toast.success(`Activated: ${sceneName}`)
        onUpdate?.()
      } catch {
        toast.error('Failed to activate scene')
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, onUpdate, isReadOnly, apiBaseUrl]
  )

  const handleLightUpdate = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/hue/zones/${zone.id}/lights`)
      const data = await response.json()
      if (data.success && data.data) {
        setLights(data.data)
      }
    } catch {}
    onUpdate?.()
  }, [zone.id, onUpdate, apiBaseUrl])

  const filteredScenes = scenes.filter(scene => {
    const name = scene.name.toLowerCase()
    if (name.includes('hueessentialseffect')) return false
    if (name === 'off') return false
    return true
  })

  const sortedScenes = [...filteredScenes].sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()
    const aIsFavorite = aName.includes('pete')
    const bIsFavorite = bName.includes('pete')
    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    const commonScenes = ['bright', 'dimmed', 'concentrate', 'relax', 'energize', 'nightlight']
    const aIsCommon = commonScenes.some(s => aName.includes(s))
    const bIsCommon = commonScenes.some(s => bName.includes(s))
    if (aIsCommon && !bIsCommon) return -1
    if (!aIsCommon && bIsCommon) return 1
    return a.name.localeCompare(b.name)
  })

  const brightnessPercent = Math.round((brightness / 254) * 100)

  const getSceneStyle = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('pete') && n.includes('red'))
      return 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
    if (n.includes('pete') && n.includes('work'))
      return 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
    if (n.includes('bright'))
      return 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
    if (n.includes('dimmed') || n.includes('nightlight'))
      return 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
    if (n.includes('concentrate'))
      return 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25'
    if (n.includes('energize'))
      return 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25'
    if (n.includes('game'))
      return 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
    return 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
  }

  const isLarge = size === 'large'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-200',
        on ? 'bg-brand/[0.08]' : 'bg-white/[0.03] hover:bg-white/[0.05]',
        isLarge ? 'p-5' : 'p-4'
      )}
    >
      {/* Accent line when on */}
      {on && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center rounded-xl transition-all duration-200',
              on ? 'bg-brand text-background' : 'bg-white/5 text-muted-foreground',
              isLarge ? 'size-12' : 'size-10'
            )}
          >
            {getRoomIcon(zone.name, isLarge ? 'size-5' : 'size-4')}
          </div>
          <div>
            <h3 className={cn('font-semibold', isLarge ? 'text-base' : 'text-sm')}>{zone.name}</h3>
            <p className="text-xs text-muted-foreground">
              {zone.lights.length} {zone.lights.length === 1 ? 'light' : 'lights'}
            </p>
          </div>
        </div>
        <ToggleSwitch checked={on} onCheckedChange={handleToggle} disabled={isReadOnly} />
      </div>

      {/* Brightness */}
      <AnimatePresence>
        {on && (
          <motion.div
            className={cn('mt-4', isLarge && 'mt-5')}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-3">
              <Slider
                value={[brightness]}
                onValueChange={handleBrightnessChange}
                onValueCommit={handleBrightnessCommit}
                min={1}
                max={254}
                step={1}
                disabled={isReadOnly || isUpdating}
                className="flex-1"
              />
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {brightnessPercent}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scenes */}
      {sortedScenes.length > 0 && (
        <div className={cn('mt-4', isLarge && 'mt-5')}>
          <div className="flex flex-wrap gap-1.5">
            {sortedScenes.slice(0, expanded ? undefined : (isLarge ? 5 : 4)).map(scene => {
              const isFavorite = scene.name.toLowerCase().includes('pete')
              return (
                <button
                  key={scene.id}
                  onClick={() => handleActivateScene(scene.id, scene.name)}
                  disabled={isReadOnly || isUpdating}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    getSceneStyle(scene.name)
                  )}
                >
                  {isFavorite && <Sparkles className="size-2.5" />}
                  {scene.name}
                </button>
              )
            })}
            {sortedScenes.length > (isLarge ? 5 : 4) && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/10"
              >
                +{sortedScenes.length - (isLarge ? 5 : 4)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expand Lights */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'mt-4 flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground',
          isLarge && 'mt-5'
        )}
      >
        <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Hide' : 'Lights'}
      </button>

      {/* Lights List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="mt-2 space-y-1 border-t border-white/5 pt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {loadingLights ? (
              <div className="flex items-center justify-center py-4">
                <div className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : lights.length > 0 ? (
              lights.map((light, index) => (
                <motion.div
                  key={light.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <HueLightItem light={light} onUpdate={handleLightUpdate} isReadOnly={isReadOnly} />
                </motion.div>
              ))
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground">No lights</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-white/5" />
          <div className="space-y-1.5">
            <div className="h-5 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex gap-4">
        <div className="h-16 w-32 animate-pulse rounded-lg bg-white/5" />
        <div className="h-16 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="h-16 w-40 animate-pulse rounded-lg bg-white/5" />
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'animate-pulse rounded-2xl bg-white/[0.03]',
              i <= 2 ? 'h-48' : 'h-40'
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
