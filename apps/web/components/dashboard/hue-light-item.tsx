'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import { Slider } from '@/components/ui/slider'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import type { HueLight } from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface HueLightItemProps {
  light: HueLight
  onUpdate?: () => Promise<void>
  /** When true, all controls are disabled (production mode) */
  isReadOnly?: boolean
}

export function HueLightItem({
  light,
  onUpdate,
  isReadOnly = false,
}: HueLightItemProps) {
  const [on, setOn] = useState(light.state.on)
  const [brightness, setBrightness] = useState(light.state.bri || 127)
  const [isUpdating, setIsUpdating] = useState(false)
  const { apiBaseUrl } = useConnectivity()

  useEffect(() => {
    setOn(light.state.on)
    setBrightness(light.state.bri || 127)
  }, [light.state.on, light.state.bri])

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
          `${apiBaseUrl}/api/hue/lights/${light.id}/toggle`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ on: checked }),
          }
        )
        if (!response.ok) throw new Error('Failed to toggle light')
        onUpdate?.()
      } catch {
        setOn(!checked)
        toast.error(`Failed to toggle ${light.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [light.id, light.name, onUpdate, isReadOnly, apiBaseUrl]
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
          `${apiBaseUrl}/api/hue/lights/${light.id}/state`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bri: value, on: true }),
          }
        )
        if (!response.ok) throw new Error('Failed to set brightness')
        setOn(true)
        onUpdate?.()
      } catch {
        toast.error(`Failed to adjust ${light.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [light.id, light.name, onUpdate, isReadOnly, apiBaseUrl]
  )

  // Determine light color display based on state
  const getLightStyles = () => {
    if (!on || !light.state.reachable) {
      return { bg: 'bg-muted/60', shadow: '', icon: 'text-muted-foreground' }
    }
    const { colormode, ct, hue } = light.state

    // For color temperature lights
    if (colormode === 'ct' && ct) {
      const warmth = (ct - 153) / (500 - 153)
      if (warmth > 0.6)
        return {
          bg: 'bg-amber-400',
          shadow: 'shadow-amber-400/30',
          icon: 'text-amber-950',
        }
      if (warmth > 0.3)
        return {
          bg: 'bg-yellow-300',
          shadow: 'shadow-yellow-300/30',
          icon: 'text-yellow-950',
        }
      return {
        bg: 'bg-white',
        shadow: 'shadow-white/20',
        icon: 'text-slate-700',
      }
    }

    // For color lights using hue
    if (colormode === 'hs' && hue !== undefined) {
      const h = hue / 65535
      if (h < 0.1 || h > 0.9)
        return {
          bg: 'bg-red-400',
          shadow: 'shadow-red-400/30',
          icon: 'text-red-950',
        }
      if (h < 0.2)
        return {
          bg: 'bg-orange-400',
          shadow: 'shadow-orange-400/30',
          icon: 'text-orange-950',
        }
      if (h < 0.35)
        return {
          bg: 'bg-yellow-400',
          shadow: 'shadow-yellow-400/30',
          icon: 'text-yellow-950',
        }
      if (h < 0.5)
        return {
          bg: 'bg-green-400',
          shadow: 'shadow-green-400/30',
          icon: 'text-green-950',
        }
      if (h < 0.6)
        return {
          bg: 'bg-cyan-400',
          shadow: 'shadow-cyan-400/30',
          icon: 'text-cyan-950',
        }
      if (h < 0.75)
        return {
          bg: 'bg-blue-400',
          shadow: 'shadow-blue-400/30',
          icon: 'text-blue-950',
        }
      return {
        bg: 'bg-purple-400',
        shadow: 'shadow-purple-400/30',
        icon: 'text-purple-950',
      }
    }

    return {
      bg: 'bg-brand',
      shadow: 'shadow-brand/30',
      icon: 'text-background',
    }
  }

  const lightStyles = getLightStyles()
  const brightnessPercent = Math.round((brightness / 254) * 100)

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200',
        on && light.state.reachable
          ? 'border-border/60 bg-card/80'
          : 'border-border/40 bg-card/40',
        !light.state.reachable && 'opacity-60'
      )}
    >
      {/* Light indicator */}
      <div className="relative">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
            lightStyles.bg,
            on && light.state.reachable && `shadow-md ${lightStyles.shadow}`
          )}
        >
          {light.state.reachable ? (
            <Lightbulb
              className={cn(
                'size-4 transition-colors',
                on ? lightStyles.icon : 'text-muted-foreground'
              )}
              strokeWidth={2}
            />
          ) : (
            <WifiOff className="text-muted-foreground size-4" />
          )}
        </div>
        {on && light.state.reachable && (
          <motion.div
            className={cn(
              'absolute -inset-0.5 -z-10 rounded-lg blur-sm',
              lightStyles.bg
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            style={{ opacity: 0.3 }}
          />
        )}
      </div>

      {/* Light info & controls */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-foreground block truncate text-sm font-medium">
              {light.name}
            </span>
            {!light.state.reachable && (
              <span className="text-destructive/80 text-[11px]">
                Unreachable
              </span>
            )}
          </div>
          <ToggleSwitch
            checked={on}
            onCheckedChange={handleToggle}
            disabled={isReadOnly}
          />
        </div>

        {/* Brightness slider - only show when on and reachable */}
        <AnimatePresence>
          {on && light.state.reachable && (
            <motion.div
              className="mt-2.5 flex items-center gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
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
              <span className="text-muted-foreground w-10 shrink-0 text-right text-xs font-medium tabular-nums">
                {brightnessPercent}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
