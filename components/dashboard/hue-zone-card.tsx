"use client"

import { useState, useEffect } from "react"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { Sofa, UtensilsCrossed, BedDouble, ShowerHead, Lamp, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { HueZone, HueScene } from "@/lib/types/hue.types"
import { toast } from "sonner"
import { apiPost } from "@/lib/api/client"

function getRoomIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes("living")) return Sofa
  if (n.includes("kitchen")) return UtensilsCrossed
  if (n.includes("bed")) return BedDouble
  if (n.includes("bath")) return ShowerHead
  return Lamp
}

interface HueZoneCardProps {
  zone: HueZone
  scenes?: HueScene[]
  onToggle?: (zoneId: string, on: boolean) => Promise<void>
  onActivateScene?: (zoneId: string, sceneId: string) => Promise<void>
}

export function HueZoneCard({ zone, scenes = [], onToggle, onActivateScene }: HueZoneCardProps) {
  const [on, setOn] = useState(zone.state.any_on)
  const [loading, setLoading] = useState(false)
  const Icon = getRoomIcon(zone.name)

  useEffect(() => {
    setOn(zone.state.any_on)
  }, [zone.state.any_on])

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      setOn(checked)
      if (onToggle) {
        await onToggle(zone.id, checked)
      } else {
        // Fallback to API call
        const response = await apiPost(`/api/hue/zones/${zone.id}/toggle`, { on: checked })
        if (!response.success) throw new Error("Failed to toggle zone")
      }
      toast.success(`${zone.name} turned ${checked ? "on" : "off"}`)
    } catch (error) {
      setOn(!checked) // Revert on error
      toast.error(`Failed to toggle ${zone.name}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSceneActivate = async (sceneId: string) => {
    setLoading(true)
    try {
      if (onActivateScene) {
        await onActivateScene(zone.id, sceneId)
      } else {
        const response = await apiPost(`/api/hue/zones/${zone.id}/scenes/${sceneId}`)
        if (!response.success) throw new Error("Failed to activate scene")
      }
      const scene = scenes.find((s) => s.id === sceneId)
      toast.success(`Activated scene: ${scene?.name || sceneId}`)
    } catch (error) {
      toast.error("Failed to activate scene")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-brand text-white">
            <Icon className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">{zone.name}</h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Open zone actions"
            className="rounded-md p-1.5 hover:bg-muted focus:outline-none focus:ring-2"
            disabled={loading}
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {scenes.length > 0 && (
              <>
                <DropdownMenuLabel>Scenes</DropdownMenuLabel>
                {scenes.map((scene) => (
                  <DropdownMenuItem
                    key={scene.id}
                    onClick={() => handleSceneActivate(scene.id)}
                    disabled={loading}
                  >
                    {scene.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">Light</p>
      <div className="mt-2">
        <ToggleSwitch checked={on} onCheckedChange={handleToggle} />
      </div>
      <div className="mt-3 text-xs text-brand">
        {zone.lights.length} {zone.lights.length === 1 ? "device" : "devices"}▾
      </div>
    </div>
  )
}
