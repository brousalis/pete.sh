"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Lightbulb, WifiOff } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { toast } from "sonner"
import type { HueLight } from "@/lib/types/hue.types"
import { cn } from "@/lib/utils"

interface HueLightItemProps {
  light: HueLight
  onUpdate?: () => Promise<void>
  /** When true, all controls are disabled (production mode) */
  isReadOnly?: boolean
}

export function HueLightItem({ light, onUpdate, isReadOnly = false }: HueLightItemProps) {
  const [on, setOn] = useState(light.state.on)
  const [brightness, setBrightness] = useState(light.state.bri || 127)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setOn(light.state.on)
    setBrightness(light.state.bri || 127)
  }, [light.state.on, light.state.bri])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (isReadOnly) {
        toast.error("Controls disabled in live view mode")
        return
      }
      setIsUpdating(true)
      setOn(checked)
      try {
        const response = await fetch(`/api/hue/lights/${light.id}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ on: checked }),
        })
        if (!response.ok) throw new Error("Failed to toggle light")
        onUpdate?.()
      } catch {
        setOn(!checked)
        toast.error(`Failed to toggle ${light.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [light.id, light.name, onUpdate, isReadOnly]
  )

  const handleBrightnessChange = (values: number[]) => {
    if (isReadOnly) return
    setBrightness(values[0])
  }

  const handleBrightnessCommit = useCallback(
    async (values: number[]) => {
      if (isReadOnly) {
        toast.error("Controls disabled in live view mode")
        return
      }
      const value = values[0]
      setIsUpdating(true)
      try {
        const response = await fetch(`/api/hue/lights/${light.id}/state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bri: value, on: true }),
        })
        if (!response.ok) throw new Error("Failed to set brightness")
        setOn(true)
        onUpdate?.()
      } catch {
        toast.error(`Failed to adjust ${light.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [light.id, light.name, onUpdate, isReadOnly]
  )

  // Determine light color display based on state
  const getLightColor = () => {
    if (!on || !light.state.reachable) return "bg-muted"
    const { colormode, ct, hue, sat } = light.state

    // For color temperature lights
    if (colormode === "ct" && ct) {
      // Map color temperature to a warm-cool gradient
      // ct ranges from ~153 (cool) to ~500 (warm)
      const warmth = (ct - 153) / (500 - 153)
      if (warmth > 0.6) return "bg-amber-400"
      if (warmth > 0.3) return "bg-yellow-300"
      return "bg-white"
    }

    // For color lights using hue
    if (colormode === "hs" && hue !== undefined) {
      // Hue is 0-65535, map to colors
      const h = hue / 65535
      if (h < 0.1 || h > 0.9) return "bg-red-400"
      if (h < 0.2) return "bg-orange-400"
      if (h < 0.35) return "bg-yellow-400"
      if (h < 0.5) return "bg-green-400"
      if (h < 0.6) return "bg-cyan-400"
      if (h < 0.75) return "bg-blue-400"
      return "bg-purple-400"
    }

    return "bg-brand"
  }

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card/50 p-3 transition-colors",
        !light.state.reachable && "opacity-50"
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Light indicator */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          on && light.state.reachable ? getLightColor() : "bg-muted"
        )}
      >
        {light.state.reachable ? (
          <Lightbulb
            className={cn(
              "size-4 transition-colors",
              on ? "text-white" : "text-muted-foreground"
            )}
          />
        ) : (
          <WifiOff className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Light info & controls */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {light.name}
          </span>
          <ToggleSwitch
            checked={on}
            onCheckedChange={handleToggle}
            disabled={isReadOnly}
          />
        </div>

        {/* Brightness slider - only show when on and reachable */}
        {on && light.state.reachable && (
          <motion.div
            className="mt-2 flex items-center gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
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
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round((brightness / 254) * 100)}%
            </span>
          </motion.div>
        )}

        {/* Unreachable indicator */}
        {!light.state.reachable && (
          <p className="mt-1 text-xs text-destructive">Unreachable</p>
        )}
      </div>
    </motion.div>
  )
}
