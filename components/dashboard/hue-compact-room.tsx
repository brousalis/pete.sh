"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sofa,
  UtensilsCrossed,
  BedDouble,
  ShowerHead,
  Lamp,
  Briefcase,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { toast } from "sonner"
import type { HueZone, HueScene } from "@/lib/types/hue.types"
import { cn } from "@/lib/utils"

function getRoomIcon(name: string) {
  const n = name.toLowerCase()
  const cls = "size-4"
  if (n.includes("living")) return <Sofa className={cls} />
  if (n.includes("kitchen")) return <UtensilsCrossed className={cls} />
  if (n.includes("bed")) return <BedDouble className={cls} />
  if (n.includes("bath")) return <ShowerHead className={cls} />
  if (n.includes("office")) return <Briefcase className={cls} />
  return <Lamp className={cls} />
}

interface HueCompactRoomProps {
  zone: HueZone
  scenes?: HueScene[]
  onUpdate?: () => Promise<void>
}

export function HueCompactRoom({ zone, scenes = [], onUpdate }: HueCompactRoomProps) {
  const [on, setOn] = useState(zone.state.any_on)
  const [brightness, setBrightness] = useState(zone.action?.bri || 127)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setOn(zone.state.any_on)
    if (zone.action?.bri) {
      setBrightness(zone.action.bri)
    }
  }, [zone.state.any_on, zone.action?.bri])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setIsUpdating(true)
      setOn(checked)
      try {
        const response = await fetch(`/api/hue/zones/${zone.id}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ on: checked }),
        })
        if (!response.ok) throw new Error("Failed to toggle zone")
        onUpdate?.()
      } catch {
        setOn(!checked)
        toast.error(`Failed to toggle ${zone.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, zone.name, onUpdate]
  )

  const handleBrightnessCommit = useCallback(
    async (values: number[]) => {
      const value = values[0]
      setIsUpdating(true)
      try {
        const response = await fetch(`/api/hue/zones/${zone.id}/brightness`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brightness: value }),
        })
        if (!response.ok) throw new Error("Failed to set brightness")
        setOn(true)
        onUpdate?.()
      } catch {
        toast.error(`Failed to adjust ${zone.name}`)
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, zone.name, onUpdate]
  )

  const handleActivateScene = useCallback(
    async (sceneId: string, sceneName: string) => {
      setIsUpdating(true)
      try {
        const response = await fetch(
          `/api/hue/zones/${zone.id}/scenes/${sceneId}`,
          { method: "POST" }
        )
        if (!response.ok) throw new Error("Failed to activate scene")
        setOn(true)
        toast.success(`${sceneName}`)
        onUpdate?.()
      } catch {
        toast.error("Failed to activate scene")
      } finally {
        setIsUpdating(false)
      }
    },
    [zone.id, onUpdate]
  )

  // Filter and sort scenes - only show top 3
  const filteredScenes = scenes
    .filter((scene) => {
      const name = scene.name.toLowerCase()
      if (name.includes("hueessentialseffect")) return false
      if (name === "off") return false
      return true
    })
    .sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aIsFavorite = aName.includes("pete")
      const bIsFavorite = bName.includes("pete")
      if (aIsFavorite && !bIsFavorite) return -1
      if (!aIsFavorite && bIsFavorite) return 1
      const commonScenes = ["bright", "dimmed", "concentrate", "relax", "energize", "nightlight"]
      const aIsCommon = commonScenes.some((s) => aName.includes(s))
      const bIsCommon = commonScenes.some((s) => bName.includes(s))
      if (aIsCommon && !bIsCommon) return -1
      if (!aIsCommon && bIsCommon) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 3)

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2 transition-colors sm:rounded-xl sm:p-3",
        on && "border-brand/30"
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors sm:size-7 sm:rounded-lg",
              on ? "bg-brand text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {getRoomIcon(zone.name)}
          </div>
          <span className="truncate text-xs font-medium sm:text-sm">{zone.name}</span>
        </div>
        <ToggleSwitch checked={on} onCheckedChange={handleToggle} />
      </div>

      {/* Brightness Slider - only when on */}
      {on && (
        <div className="mt-1.5 flex items-center gap-1.5 sm:mt-2 sm:gap-2">
          <Slider
            value={[brightness]}
            onValueChange={(v) => setBrightness(v[0] ?? 127)}
            onValueCommit={handleBrightnessCommit}
            min={1}
            max={254}
            step={1}
            disabled={isUpdating}
            className="flex-1"
          />
          <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground sm:w-8 sm:text-xs">
            {Math.round((brightness / 254) * 100)}%
          </span>
        </div>
      )}

      {/* Scene Buttons - compact */}
      {filteredScenes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2">
          {filteredScenes.map((scene) => {
            const isFavorite = scene.name.toLowerCase().includes("pete")
            return (
              <Button
                key={scene.id}
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                onClick={() => handleActivateScene(scene.id, scene.name)}
                disabled={isUpdating}
                className={cn(
                  "h-5 px-1.5 text-[10px] sm:h-6 sm:px-2 sm:text-xs",
                  isFavorite && "bg-brand hover:bg-brand/90"
                )}
              >
                {isFavorite && <Sparkles className="mr-0.5 size-2.5 sm:mr-1 sm:size-3" />}
                {scene.name}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
