'use client'

import {
  useConnectivity,
  useIsReadOnly,
} from '@/components/connectivity-provider'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { LiveBadge, ReadOnlyNotice } from '@/components/ui/live-badge'
import { PageHeader, PageHeaderRow } from '@/components/ui/page-header'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { apiGet, apiPost, apiPut } from '@/lib/api/client'
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
  Dumbbell,
  Home,
  Lamp,
  Lightbulb,
  Loader2,
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
  const isReadOnly = useIsReadOnly()
  const { isInitialized } = useConnectivity()

  // Hue Sync state
  const [syncStatus, setSyncStatus] = useState<{ active: boolean } | null>(null)
  const [syncArea, setSyncArea] = useState<{ id: string; name: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [zonesRes, scenesRes, statusRes, entertainmentRes] = await Promise.all([
        apiGet<Record<string, HueZone>>('/api/hue/zones'),
        apiGet<HueScene[]>('/api/hue/scenes'),
        apiGet<HueAllLightsStatus>('/api/hue/all'),
        apiGet<Array<{ id: string; name: string }>>('/api/hue/entertainment').catch(() => ({ success: false })),
      ])

      if (!zonesRes.success || !zonesRes.data) {
        if (zonesRes.error?.toLowerCase().includes('not configured')) {
          setError('HUE bridge not configured')
          return
        }
        throw new Error(zonesRes.error || 'Failed to fetch zones')
      }

      const allZones = Object.entries(zonesRes.data)
        .map(([id, zone]) => ({ ...zone, id }))
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

      // Derive zone scenes from allScenes (scene.group === zone id) - no per-zone fetches
      if (scenesRes.success && scenesRes.data) {
        setAllScenes(scenesRes.data)
        const scenesMap: Record<string, HueScene[]> = {}
        for (const zone of zonesArray) {
          scenesMap[zone.id] = scenesRes.data.filter(s => s.group === zone.id)
        }
        setScenes(scenesMap)
      }

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data)
        if (statusRes.data.averageBrightness) {
          setBrightness(statusRes.data.averageBrightness)
        }
      }

      if (
        entertainmentRes.success &&
        'data' in entertainmentRes &&
        Array.isArray(entertainmentRes.data) &&
        entertainmentRes.data.length > 0
      ) {
        const area =
          entertainmentRes.data.find((a: { name: string }) => a.name.toLowerCase().includes('office')) ??
          entertainmentRes.data[0]
        if (area) {
          setSyncArea(area)
          const syncRes = await apiGet<{ active: boolean }>(`/api/hue/entertainment/${area.id}`)
          if (syncRes.success && syncRes.data) {
            setSyncStatus(syncRes.data)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HUE data')
      toast.error('Failed to load HUE data')
    } finally {
      setLoading(false)
    }
  }, [])

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
        const res = await apiGet<{ active: boolean }>(`/api/hue/entertainment/${syncArea.id}`)
        if (res.success && res.data) {
          setSyncStatus(res.data)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [syncArea])

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
      return 'bg-accent-rose/20 text-accent-rose hover:bg-accent-rose/30'
    if (n.includes('purple') || n.includes('rain'))
      return 'bg-accent-violet/20 text-accent-violet hover:bg-accent-violet/30'
    if (n.includes('work') || n.includes('concentrate'))
      return 'bg-accent-azure/20 text-accent-azure hover:bg-accent-azure/30'
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
      <div className="rounded-xl bg-accent-rose/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-rose/20">
            <AlertCircle className="size-6 text-accent-rose" />
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
    <div className="space-y-4">
      <PageHeader
        secondaryRow={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
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
                <div className="mt-1 flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAll(true)}
                    disabled={isReadOnly || isTogglingAll || status?.allOn}
                    className="h-6 min-h-[44px] px-2 text-[11px] sm:min-h-0"
                  >
                    All On
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAll(false)}
                    disabled={isReadOnly || isTogglingAll || !status?.anyOn}
                    className="h-6 min-h-[44px] px-2 text-[11px] sm:min-h-0"
                  >
                    All Off
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-white/10 hidden sm:block" />

            {/* Quick Scenes */}
            {favoriteScenes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {favoriteScenes.map(scene => {
                  const Icon = getSceneIcon(scene.name)
                  const isActivating = activatingScene === scene.id
                  return (
                    <button
                      key={scene.id}
                      onClick={() => handleActivateScene(scene)}
                      disabled={isReadOnly || isActivating}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        getSceneStyles(scene.name)
                      )}
                    >
                      {isActivating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                      <span className="capitalize">{scene.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="h-10 w-px bg-white/10 hidden lg:block" />

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
                  <div className="flex w-32 items-center gap-2">
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
                    <span className="w-7 tabular-nums text-[11px] text-muted-foreground">
                      {brightnessPercent}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Hue Sync */}
            {syncArea && (
              <>
                <div className="h-10 w-px bg-white/10 hidden xl:block" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex size-7 items-center justify-center rounded-md transition-all',
                          syncStatus?.active
                            ? 'bg-accent-violet/20 text-accent-violet'
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
                            syncStatus?.active ? 'animate-pulse bg-accent-sage' : 'bg-white/20'
                          )}
                        />
                      </div>
                      {syncStatus?.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStopSync}
                          disabled={isReadOnly}
                          className="h-6 gap-1 px-2 text-[11px] text-accent-rose hover:bg-accent-rose/10 hover:text-accent-rose"
                        >
                          <Square className="size-2.5" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Sync lights with screen content (Hue Entertainment)
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        }
      >
        <PageHeaderRow className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/15">
              <Lightbulb className="size-5 text-brand" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Lighting</h1>
                <LiveBadge />
              </div>
              <p className="text-sm text-muted-foreground">
                {zones.length} rooms · {status?.totalLights || 0} lights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ReadOnlyNotice className="shrink-0 rounded-lg" />
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </PageHeaderRow>
      </PageHeader>

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
              activatingSceneId={activatingScene}
              onActivateScene={handleActivateScene}
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
              activatingSceneId={activatingScene}
              onActivateScene={handleActivateScene}
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
  activatingSceneId?: string | null
  onActivateScene?: (scene: HueScene) => Promise<void>
  size?: 'large' | 'compact'
}

function RoomCard({
  zone,
  scenes = [],
  onUpdate,
  isReadOnly = false,
  activatingSceneId,
  onActivateScene,
  size = 'compact',
}: RoomCardProps) {
  const [on, setOn] = useState(zone.state.any_on)
  const [brightness, setBrightness] = useState(zone.action?.bri || 127)
  const [isUpdating, setIsUpdating] = useState(false)
  const [scenesExpanded, setScenesExpanded] = useState(false)
  const [lightsOpen, setLightsOpen] = useState(false)
  const [lights, setLights] = useState<HueLight[]>([])
  const [loadingLights, setLoadingLights] = useState(false)

  useEffect(() => {
    setOn(zone.state.any_on)
    if (zone.action?.bri) {
      setBrightness(zone.action.bri)
    }
  }, [zone.state.any_on, zone.action?.bri])

  useEffect(() => {
    if (lightsOpen && lights.length === 0) {
      setLoadingLights(true)
      apiGet<HueLight[]>(`/api/hue/zones/${zone.id}/lights`)
        .then(res => {
          if (res.success && res.data) {
            setLights(res.data)
          }
        })
        .catch(() => toast.error('Failed to load lights'))
        .finally(() => setLoadingLights(false))
    }
  }, [lightsOpen, zone.id, lights.length])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (isReadOnly) {
        toast.error('Controls disabled in live view mode')
        return
      }
      setIsUpdating(true)
      setOn(checked)
      try {
        const response = await apiPost(`/api/hue/zones/${zone.id}/toggle`, { on: checked })
        if (!response.success) throw new Error('Failed to toggle zone')
        onUpdate?.()
      } catch {
        setOn(!checked)
        toast.error(`Failed to toggle ${zone.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, zone.name, onUpdate, isReadOnly]
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
        const response = await apiPost(`/api/hue/zones/${zone.id}/brightness`, { brightness: value })
        if (!response.success) throw new Error('Failed to set brightness')
        setOn(true)
        onUpdate?.()
      } catch {
        toast.error(`Failed to adjust ${zone.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, zone.name, onUpdate, isReadOnly]
  )


  const handleLightUpdate = useCallback(async () => {
    try {
      const res = await apiGet<HueLight[]>(`/api/hue/zones/${zone.id}/lights`)
      if (res.success && res.data) {
        setLights(res.data)
      }
    } catch {}
    onUpdate?.()
  }, [zone.id, onUpdate])

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
      return 'bg-accent-rose/20 text-accent-rose hover:bg-accent-rose/30'
    if (n.includes('pete') && n.includes('work'))
      return 'bg-accent-azure/20 text-accent-azure hover:bg-accent-azure/30'
    if (n.includes('bright'))
      return 'bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25'
    if (n.includes('dimmed') || n.includes('nightlight'))
      return 'bg-accent-violet/15 text-accent-violet hover:bg-accent-violet/25'
    if (n.includes('concentrate'))
      return 'bg-accent-teal/15 text-accent-teal hover:bg-accent-teal/25'
    if (n.includes('energize'))
      return 'bg-accent-ember/15 text-accent-ember hover:bg-accent-ember/25'
    if (n.includes('game'))
      return 'bg-accent-sage/15 text-accent-sage hover:bg-accent-sage/25'
    return 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
  }

  const isLarge = size === 'large'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-200',
        on ? 'bg-brand/[0.08]' : 'bg-white/[0.03] hover:bg-white/[0.05]',
        'p-3'
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
            className="mt-3"
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
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {sortedScenes.slice(0, scenesExpanded ? undefined : (isLarge ? 5 : 4)).map(scene => {
              const isFavorite = scene.name.toLowerCase().includes('pete')
              const isActivating = activatingSceneId === scene.id
              return (
                <button
                  key={scene.id}
                  onClick={() => onActivateScene?.(scene)}
                  disabled={isReadOnly || isActivating}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    getSceneStyle(scene.name)
                  )}
                >
                  {isActivating ? (
                    <Loader2 className="size-2.5 animate-spin" />
                  ) : (
                    isFavorite && <Sparkles className="size-2.5" />
                  )}
                  {scene.name}
                </button>
              )
            })}
            {sortedScenes.length > (isLarge ? 5 : 4) && !scenesExpanded && (
              <button
                onClick={() => setScenesExpanded(true)}
                className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/10"
              >
                +{sortedScenes.length - (isLarge ? 5 : 4)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lights - Collapsible */}
      <Collapsible open={lightsOpen} onOpenChange={setLightsOpen} className="mt-3">
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-center gap-1 py-2 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            type="button"
          >
            <ChevronDown className={cn('size-3.5 transition-transform', lightsOpen && 'rotate-180')} />
            {lightsOpen ? 'Hide' : 'Lights'}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1 border-t border-white/5 pt-3">
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* PageHeader shape */}
      <div className="rounded-xl border border-border/50 bg-card/40">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-xl bg-white/5" />
            <div className="space-y-1.5">
              <div className="h-5 w-24 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
            </div>
          </div>
          <div className="h-8 w-16 animate-pulse rounded bg-white/5" />
        </div>
        <div className="flex flex-wrap gap-4 border-t border-border/30 px-3 py-2">
          <div className="h-12 w-28 animate-pulse rounded-lg bg-white/5" />
          <div className="h-12 w-36 animate-pulse rounded-lg bg-white/5" />
          <div className="h-12 w-32 animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'animate-pulse rounded-2xl bg-white/[0.03]',
              i <= 2 ? 'h-44' : 'h-36'
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
