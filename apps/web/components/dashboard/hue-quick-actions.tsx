'use client'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { apiPost } from '@/lib/api/client'
import type { HueAllLightsStatus, HueScene } from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Moon,
  Palette,
  Power,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface HueQuickActionsProps {
  status: HueAllLightsStatus | null
  scenes: HueScene[]
  onRefresh: () => Promise<void>
  favoriteSceneNames?: string[]
  /** When true, all controls are disabled (production mode) */
  isReadOnly?: boolean
  /** Zone ID to target for brightness control (defaults to all lights) */
  brightnessZoneId?: string
  /** Zone name to display for brightness control */
  brightnessZoneName?: string
}

const presetBrightness = [
  { label: 'Dim', value: 32, icon: Moon },
  { label: 'Medium', value: 127, icon: Sparkles },
  { label: 'Bright', value: 254, icon: Sun },
]

export function HueQuickActions({
  status,
  scenes,
  onRefresh,
  favoriteSceneNames = ['pete red', 'pete work'],
  isReadOnly = false,
  brightnessZoneId,
  brightnessZoneName,
}: HueQuickActionsProps) {
  const [isTogglingAll, setIsTogglingAll] = useState(false)
  const [activatingScene, setActivatingScene] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(status?.averageBrightness || 127)

  useEffect(() => {
    if (status?.averageBrightness) {
      setBrightness(status.averageBrightness)
    }
  }, [status?.averageBrightness])

  // Find favorite scenes
  const favoriteScenes = scenes.filter(scene =>
    favoriteSceneNames.some(name =>
      scene.name.toLowerCase().includes(name.toLowerCase())
    )
  )

  // Determine the zone ID for brightness control
  // Priority: 1) Explicit prop, 2) Zone from first favorite scene
  const effectiveBrightnessZoneId = brightnessZoneId || favoriteScenes[0]?.group

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
      await onRefresh()
    } catch {
      toast.error('Failed to toggle lights')
    } finally {
      setIsTogglingAll(false)
    }
  }

  const handleBrightnessPreset = async (value: number) => {
    if (isReadOnly) {
      toast.error('Controls disabled in live view mode')
      return
    }
    if (!effectiveBrightnessZoneId) {
      toast.error('No zone configured for brightness control')
      return
    }
    setBrightness(value)
    try {
      const response = await apiPost(
        `/api/hue/zones/${effectiveBrightnessZoneId}/brightness`,
        { brightness: value }
      )
      if (!response.success) throw new Error('Failed to set brightness')
      const targetName = brightnessZoneName || 'Office'
      toast.success(
        `${targetName} brightness set to ${Math.round((value / 254) * 100)}%`
      )
      await onRefresh()
    } catch {
      toast.error('Failed to set brightness')
    }
  }

  const handleBrightnessChange = async (values: number[]) => {
    if (isReadOnly) return
    const value = values[0]
    if (value !== undefined) {
      setBrightness(value)
    }
  }

  const handleBrightnessCommit = async (values: number[]) => {
    if (isReadOnly) {
      toast.error('Controls disabled in live view mode')
      return
    }
    const value = values[0]
    if (value === undefined) return
    if (!effectiveBrightnessZoneId) {
      toast.error('No zone configured for brightness control')
      return
    }
    try {
      const response = await apiPost(
        `/api/hue/zones/${effectiveBrightnessZoneId}/brightness`,
        { brightness: value }
      )
      if (!response.success) throw new Error('Failed to set brightness')
      await onRefresh()
    } catch {
      toast.error('Failed to set brightness')
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
      const response = await apiPost(
        `/api/hue/zones/${scene.group}/scenes/${scene.id}`
      )
      if (!response.success) throw new Error('Failed to activate scene')
      toast.success(`Activated: ${scene.name}`)
      await onRefresh()
    } catch {
      toast.error('Failed to activate scene')
    } finally {
      setActivatingScene(null)
    }
  }

  const getSceneIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('red') || n.includes('relax')) return Palette
    if (n.includes('work') || n.includes('concentrate')) return Briefcase
    if (n.includes('bright') || n.includes('energize')) return Zap
    return Sparkles
  }

  const getSceneStyles = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('red'))
      return {
        bg: 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent',
        border: 'border-red-500/40 hover:border-red-500/60',
        text: 'text-red-400',
        glow: 'hover:shadow-red-500/20',
      }
    if (n.includes('purple') || n.includes('rain'))
      return {
        bg: 'bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent',
        border: 'border-purple-500/40 hover:border-purple-500/60',
        text: 'text-purple-400',
        glow: 'hover:shadow-purple-500/20',
      }
    if (n.includes('work') || n.includes('concentrate'))
      return {
        bg: 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent',
        border: 'border-blue-500/40 hover:border-blue-500/60',
        text: 'text-blue-400',
        glow: 'hover:shadow-blue-500/20',
      }
    if (n.includes('relax') || n.includes('orange'))
      return {
        bg: 'bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-transparent',
        border: 'border-orange-500/40 hover:border-orange-500/60',
        text: 'text-orange-400',
        glow: 'hover:shadow-orange-500/20',
      }
    return {
      bg: 'bg-gradient-to-br from-brand/20 via-brand/10 to-transparent',
      border: 'border-brand/40 hover:border-brand/60',
      text: 'text-brand',
      glow: 'hover:shadow-brand/20',
    }
  }

  const brightnessPercent = Math.round((brightness / 254) * 100)

  return (
    <div className="space-y-3">
      {/* Top Row: Status + All On/Off + Quick Scenes */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-lg transition-all',
              status?.anyOn
                ? 'bg-brand/15 text-brand'
                : 'bg-muted/60 text-muted-foreground'
            )}
          >
            <Power className="size-4" strokeWidth={2.5} />
          </div>
          <div className="text-sm">
            <span className="text-foreground font-semibold">
              {status?.lightsOn || 0}/{status?.totalLights || 0}
            </span>
            <span className="text-muted-foreground ml-1.5">
              {status?.anyOn ? `· ${brightnessPercent}%` : 'off'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="bg-border/50 h-5 w-px" />

        {/* All On/Off Buttons */}
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(true)}
            disabled={isReadOnly || isTogglingAll || status?.allOn}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Sun className="size-3.5" />
            All On
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(false)}
            disabled={isReadOnly || isTogglingAll || !status?.anyOn}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Moon className="size-3.5" />
            All Off
          </Button>
        </div>

        {/* Divider + Quick Scene Buttons */}
        {favoriteScenes.length > 0 && (
          <>
            <div className="bg-border/50 h-5 w-px" />
            <div className="flex flex-wrap gap-1.5">
              {favoriteScenes.map(scene => {
                const Icon = getSceneIcon(scene.name)
                const styles = getSceneStyles(scene.name)
                return (
                  <motion.button
                    key={scene.id}
                    onClick={() => handleActivateScene(scene)}
                    disabled={isReadOnly || activatingScene === scene.id}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
                      'transition-all',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      styles.bg,
                      styles.border,
                      styles.text
                    )}
                    whileHover={isReadOnly ? {} : { scale: 1.02 }}
                    whileTap={isReadOnly ? {} : { scale: 0.98 }}
                  >
                    <Icon className="size-3.5" />
                    <span className="capitalize">{scene.name}</span>
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Brightness Row */}
      {effectiveBrightnessZoneId && (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-muted-foreground/70 shrink-0 text-[11px] font-medium tracking-wider uppercase">
            {brightnessZoneName || 'Office'}
          </span>

          {/* Preset Buttons */}
          <div className="flex gap-1">
            {presetBrightness.map(preset => {
              const Icon = preset.icon
              const isActive =
                Math.abs(brightness - preset.value) < 20 && status?.anyOn
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleBrightnessPreset(preset.value)}
                  disabled={isReadOnly}
                  className={cn(
                    'h-7 gap-1 px-2 text-xs',
                    isActive &&
                      'bg-foreground text-background hover:bg-foreground/90'
                  )}
                >
                  <Icon className="size-3.5" />
                  {preset.label}
                </Button>
              )
            })}
          </div>

          {/* Brightness Slider */}
          {status?.anyOn && (
            <>
              <div className="bg-border/40 h-5 w-px" />
              <div className="flex min-w-[200px] flex-1 items-center gap-2">
                <Moon className="text-muted-foreground/50 size-3.5 shrink-0" />
                <Slider
                  value={[brightness]}
                  onValueChange={handleBrightnessChange}
                  onValueCommit={handleBrightnessCommit}
                  min={1}
                  max={254}
                  step={1}
                  disabled={isReadOnly}
                  className="flex-1"
                />
                <Sun className="text-muted-foreground/50 size-3.5 shrink-0" />
                <span className="text-foreground w-9 text-right text-xs font-medium tabular-nums">
                  {brightnessPercent}%
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
