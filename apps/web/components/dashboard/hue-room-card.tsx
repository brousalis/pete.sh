'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import type { HueLight, HueScene, HueZone } from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BedDouble,
  Briefcase,
  ChevronDown,
  Dumbbell,
  Home,
  Lamp,
  ShowerHead,
  Sofa,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HueLightItem } from './hue-light-item'

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

interface HueRoomCardProps {
  zone: HueZone
  scenes?: HueScene[]
  onUpdate?: () => Promise<void>
  /** When true, all controls are disabled (production mode) */
  isReadOnly?: boolean
}

export function HueRoomCard({
  zone,
  scenes = [],
  onUpdate,
  isReadOnly = false,
}: HueRoomCardProps) {
  const [on, setOn] = useState(zone.state.any_on)
  const [brightness, setBrightness] = useState(zone.action?.bri || 127)
  const [isUpdating, setIsUpdating] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [lights, setLights] = useState<HueLight[]>([])
  const [loadingLights, setLoadingLights] = useState(false)
  const { apiBaseUrl } = useConnectivity()

  useEffect(() => {
    setOn(zone.state.any_on)
    if (zone.action?.bri) {
      setBrightness(zone.action.bri)
    }
  }, [zone.state.any_on, zone.action?.bri])

  // Fetch lights when expanded
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
        const response = await fetch(
          `${apiBaseUrl}/api/hue/zones/${zone.id}/toggle`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ on: checked }),
          }
        )
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
      if (isReadOnly) {
        toast.error('Controls disabled in live view mode')
        return
      }
      const value = values[0]
      if (value === undefined) return
      setIsUpdating(true)
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/hue/zones/${zone.id}/brightness`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brightness: value }),
          }
        )
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
        const response = await fetch(
          `${apiBaseUrl}/api/hue/zones/${zone.id}/scenes/${sceneId}`,
          { method: 'POST' }
        )
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
    // Refresh lights
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/hue/zones/${zone.id}/lights`
      )
      const data = await response.json()
      if (data.success && data.data) {
        setLights(data.data)
      }
    } catch {
      // Silently fail - main refresh will catch it
    }
    onUpdate?.()
  }, [zone.id, onUpdate, apiBaseUrl])

  // Filter and sort scenes
  // - Filter out auto-generated effect scenes (HueEssentialsEffect, etc.)
  // - Put "pete" scenes first
  // - Put common scenes (Bright, Dimmed, etc.) second
  const filteredScenes = scenes.filter(scene => {
    const name = scene.name.toLowerCase()
    // Filter out effect/auto-generated scenes
    if (name.includes('hueessentialseffect')) return false
    if (name === 'off') return false // "off" is redundant with the toggle
    return true
  })

  const sortedScenes = [...filteredScenes].sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()

    // Pete scenes first (favorites)
    const aIsFavorite = aName.includes('pete')
    const bIsFavorite = bName.includes('pete')
    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1

    // Common scene names second
    const commonScenes = [
      'bright',
      'dimmed',
      'concentrate',
      'relax',
      'energize',
      'nightlight',
    ]
    const aIsCommon = commonScenes.some(s => aName.includes(s))
    const bIsCommon = commonScenes.some(s => bName.includes(s))
    if (aIsCommon && !bIsCommon) return -1
    if (!aIsCommon && bIsCommon) return 1

    return a.name.localeCompare(b.name)
  })

  const brightnessPercent = Math.round((brightness / 254) * 100)

  return (
    <motion.div
      className={cn(
        'group bg-card relative overflow-hidden rounded-2xl border transition-all duration-300',
        on
          ? 'border-brand/40 shadow-brand/5 shadow-lg'
          : 'border-border/60 hover:border-border'
      )}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Subtle glow effect when on */}
      {on && (
        <div className="from-brand/5 pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-transparent" />
      )}

      {/* Header */}
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl transition-all duration-300',
                  on
                    ? 'bg-brand text-background shadow-brand/25 shadow-md'
                    : 'bg-muted/80 text-muted-foreground'
                )}
              >
                {getRoomIcon(zone.name)}
              </div>
              {on && (
                <motion.div
                  className="bg-brand/30 absolute -inset-0.5 -z-10 rounded-xl blur-md"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>
            <div>
              <h3 className="text-foreground font-semibold">{zone.name}</h3>
              <p className="text-muted-foreground text-xs">
                {zone.lights.length}{' '}
                {zone.lights.length === 1 ? 'light' : 'lights'}
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={on}
            onCheckedChange={handleToggle}
            disabled={isReadOnly}
          />
        </div>

        {/* Brightness Slider */}
        <AnimatePresence>
          {on && (
            <motion.div
              className="mt-5"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
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
                <span className="bg-muted/60 text-foreground w-12 shrink-0 rounded-md px-2 py-1 text-center text-xs font-medium tabular-nums">
                  {brightnessPercent}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene Buttons */}
        {sortedScenes.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <p className="text-muted-foreground/70 text-[11px] font-semibold tracking-wider uppercase">
              Scenes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sortedScenes.slice(0, expanded ? undefined : 4).map(scene => {
                const isFavorite = scene.name.toLowerCase().includes('pete')
                return (
                  <Button
                    key={scene.id}
                    variant={isFavorite ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleActivateScene(scene.id, scene.name)}
                    disabled={isReadOnly || isUpdating}
                    className={cn(
                      'h-7 gap-1.5 px-2.5 text-xs font-medium transition-all',
                      isFavorite
                        ? 'bg-brand text-background hover:bg-brand/90 shadow-brand/20 shadow-sm'
                        : 'border-border/60 hover:border-border hover:bg-muted/50'
                    )}
                  >
                    {isFavorite && <Sparkles className="size-3" />}
                    {scene.name}
                  </Button>
                )
              })}
              {sortedScenes.length > 4 && !expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                >
                  +{sortedScenes.length - 4} more
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 border-t py-2.5 text-xs font-medium transition-all',
          'text-muted-foreground hover:text-foreground',
          expanded
            ? 'border-border/60 bg-muted/30'
            : 'border-border/40 bg-muted/20 hover:bg-muted/40'
        )}
      >
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="size-4" />
        </motion.span>
        {expanded ? 'Hide lights' : 'Show lights'}
      </button>

      {/* Expanded Lights List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="border-border/40 bg-muted/10 border-t p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              {loadingLights ? (
                <div className="flex items-center justify-center py-6">
                  <div className="border-brand size-5 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              ) : lights.length > 0 ? (
                lights.map((light, index) => (
                  <motion.div
                    key={light.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <HueLightItem
                      light={light}
                      onUpdate={handleLightUpdate}
                      isReadOnly={isReadOnly}
                    />
                  </motion.div>
                ))
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No lights in this room
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
