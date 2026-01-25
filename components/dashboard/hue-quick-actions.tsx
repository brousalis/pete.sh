"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Power,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Palette,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import type { HueAllLightsStatus, HueScene } from "@/lib/types/hue.types"
import { cn } from "@/lib/utils"

interface HueQuickActionsProps {
  status: HueAllLightsStatus | null
  scenes: HueScene[]
  onRefresh: () => Promise<void>
  favoriteSceneNames?: string[]
  /** When true, all controls are disabled (production mode) */
  isReadOnly?: boolean
}

const presetBrightness = [
  { label: "Dim", value: 32, icon: Moon },
  { label: "Medium", value: 127, icon: Sparkles },
  { label: "Bright", value: 254, icon: Sun },
]

export function HueQuickActions({
  status,
  scenes,
  onRefresh,
  favoriteSceneNames = ["pete red", "pete work"],
  isReadOnly = false,
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
  const favoriteScenes = scenes.filter((scene) =>
    favoriteSceneNames.some(
      (name) => scene.name.toLowerCase().includes(name.toLowerCase())
    )
  )

  const handleToggleAll = async (on: boolean) => {
    if (isReadOnly) {
      toast.error("Controls disabled in live view mode")
      return
    }
    setIsTogglingAll(true)
    try {
      const response = await fetch("/api/hue/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      })
      if (!response.ok) throw new Error("Failed to toggle lights")
      toast.success(on ? "All lights on" : "All lights off")
      await onRefresh()
    } catch {
      toast.error("Failed to toggle lights")
    } finally {
      setIsTogglingAll(false)
    }
  }

  const handleBrightnessPreset = async (value: number) => {
    if (isReadOnly) {
      toast.error("Controls disabled in live view mode")
      return
    }
    setBrightness(value)
    try {
      const response = await fetch("/api/hue/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: true, brightness: value }),
      })
      if (!response.ok) throw new Error("Failed to set brightness")
      toast.success(`Brightness set to ${Math.round((value / 254) * 100)}%`)
      await onRefresh()
    } catch {
      toast.error("Failed to set brightness")
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
      toast.error("Controls disabled in live view mode")
      return
    }
    const value = values[0]
    if (value === undefined) return
    try {
      const response = await fetch("/api/hue/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: true, brightness: value }),
      })
      if (!response.ok) throw new Error("Failed to set brightness")
      await onRefresh()
    } catch {
      toast.error("Failed to set brightness")
    }
  }

  const handleActivateScene = async (scene: HueScene) => {
    if (isReadOnly) {
      toast.error("Controls disabled in live view mode")
      return
    }
    if (!scene.group) {
      toast.error("Scene has no associated zone")
      return
    }

    setActivatingScene(scene.id)
    try {
      const response = await fetch(
        `/api/hue/zones/${scene.group}/scenes/${scene.id}`,
        { method: "POST" }
      )
      if (!response.ok) throw new Error("Failed to activate scene")
      toast.success(`Activated: ${scene.name}`)
      await onRefresh()
    } catch {
      toast.error("Failed to activate scene")
    } finally {
      setActivatingScene(null)
    }
  }

  const getSceneIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("red") || n.includes("relax")) return Palette
    if (n.includes("work") || n.includes("concentrate")) return Briefcase
    if (n.includes("bright") || n.includes("energize")) return Zap
    return Sparkles
  }

  const getSceneColor = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("red")) return "from-red-500/20 to-red-600/10 text-red-400 border-red-500/30"
    if (n.includes("work") || n.includes("concentrate"))
      return "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30"
    if (n.includes("relax"))
      return "from-orange-500/20 to-orange-600/10 text-orange-400 border-orange-500/30"
    return "from-brand/20 to-brand/10 text-brand border-brand/30"
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-colors",
              status?.anyOn
                ? "bg-brand/20 text-brand"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Power className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {status?.lightsOn || 0} of {status?.totalLights || 0} lights on
            </p>
            <p className="text-xs text-muted-foreground">
              {status?.anyOn
                ? `${Math.round((brightness / 254) * 100)}% brightness`
                : "All lights off"}
            </p>
          </div>
        </div>

        {/* All On/Off Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(true)}
            disabled={isReadOnly || isTogglingAll || status?.allOn}
            className="gap-2"
          >
            <Sun className="size-4" />
            All On
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleAll(false)}
            disabled={isReadOnly || isTogglingAll || !status?.anyOn}
            className="gap-2"
          >
            <Moon className="size-4" />
            All Off
          </Button>
        </div>
      </div>

      {/* Favorite Scene Shortcuts */}
      {favoriteScenes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quick Scenes
          </h3>
          <div className="flex flex-wrap gap-2">
            {favoriteScenes.map((scene) => {
              const Icon = getSceneIcon(scene.name)
              const colorClasses = getSceneColor(scene.name)
              return (
                <motion.button
                  key={scene.id}
                  onClick={() => handleActivateScene(scene)}
                  disabled={isReadOnly || activatingScene === scene.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-gradient-to-br px-4 py-2.5 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                    colorClasses
                  )}
                  whileHover={isReadOnly ? {} : { scale: 1.02 }}
                  whileTap={isReadOnly ? {} : { scale: 0.98 }}
                >
                  <Icon className="size-4" />
                  <span className="capitalize">{scene.name}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Brightness Presets */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Brightness
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {presetBrightness.map((preset) => {
            const Icon = preset.icon
            const isActive =
              Math.abs(brightness - preset.value) < 20 && status?.anyOn
            return (
              <Button
                key={preset.label}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleBrightnessPreset(preset.value)}
                disabled={isReadOnly}
                className="gap-2"
              >
                <Icon className="size-4" />
                {preset.label}
              </Button>
            )
          })}
        </div>

        {/* Brightness Slider */}
        {status?.anyOn && (
          <div className="flex items-center gap-4 pt-2">
            <Moon className="size-4 text-muted-foreground" />
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
            <Sun className="size-4 text-muted-foreground" />
            <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
              {Math.round((brightness / 254) * 100)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
