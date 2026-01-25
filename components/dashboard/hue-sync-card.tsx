"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Monitor, Play, Square, RefreshCw, Tv2, Gamepad2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { toast } from "sonner"
import type { HueEntertainmentArea, HueEntertainmentStatus } from "@/lib/types/hue.types"
import { cn } from "@/lib/utils"

interface HueSyncCardProps {
  /** Name to search for entertainment area (e.g., "office") */
  areaName?: string
  /** Or provide a specific area ID */
  areaId?: string
  /** Called when sync state changes */
  onUpdate?: () => Promise<void>
}

export function HueSyncCard({
  areaName = "office",
  areaId,
  onUpdate,
}: HueSyncCardProps) {
  const [area, setArea] = useState<HueEntertainmentArea | null>(null)
  const [status, setStatus] = useState<HueEntertainmentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const fetchArea = useCallback(async () => {
    try {
      setLoading(true)

      // If we have an ID, use it directly
      if (areaId) {
        const statusRes = await fetch(`/api/hue/entertainment/${areaId}`)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.success) {
            setStatus(statusData.data)
          }
        }
        return
      }

      // Otherwise search by name
      const response = await fetch(
        `/api/hue/entertainment?name=${encodeURIComponent(areaName)}`
      )
      if (!response.ok) return

      const data = await response.json()
      if (data.success && data.data) {
        setArea(data.data)

        // Fetch current status
        const statusRes = await fetch(`/api/hue/entertainment/${data.data.id}`)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.success) {
            setStatus(statusData.data)
          }
        }
      }
    } catch {
      // Silently fail - entertainment might not be configured
    } finally {
      setLoading(false)
    }
  }, [areaId, areaName])

  useEffect(() => {
    fetchArea()
  }, [fetchArea])

  // Poll for status while active
  useEffect(() => {
    if (!status?.active) return

    const interval = setInterval(async () => {
      const id = areaId || area?.id
      if (!id) return

      try {
        const res = await fetch(`/api/hue/entertainment/${id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setStatus(data.data)
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [status?.active, areaId, area?.id])

  const handleToggle = async (active: boolean) => {
    const id = areaId || area?.id
    if (!id) return

    setToggling(true)
    try {
      const response = await fetch(`/api/hue/entertainment/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to toggle Hue Sync")
      }

      setStatus((prev) => (prev ? { ...prev, active } : { active }))
      toast.success(active ? "Hue Sync started" : "Hue Sync stopped")
      onUpdate?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle Hue Sync"
      )
    } finally {
      setToggling(false)
    }
  }

  // Don't render if no entertainment area found
  if (loading) {
    return (
      <motion.div
        className="rounded-2xl border bg-card p-4 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </motion.div>
    )
  }

  if (!area && !areaId) {
    return null // No entertainment area configured
  }

  const isActive = status?.active || false

  return (
    <motion.div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors",
        isActive && "border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl transition-all",
                isActive
                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Monitor className="size-5" />
                </motion.div>
              ) : (
                <Monitor className="size-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Hue Sync</h3>
              <p className="text-xs text-muted-foreground">
                {area?.name || "Entertainment Area"}
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={isActive}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full transition-colors",
              isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {isActive ? "Syncing with screen" : "Ready to sync"}
          </span>
        </div>

        {/* Quick actions when active */}
        {isActive && (
          <motion.div
            className="mt-4 flex gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(false)}
              disabled={toggling}
              className="gap-2 text-xs"
            >
              <Square className="size-3" />
              Stop Sync
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchArea}
              disabled={toggling}
              className="gap-2 text-xs"
            >
              <RefreshCw className="size-3" />
              Refresh
            </Button>
          </motion.div>
        )}

        {/* Mode indicators */}
        {!isActive && (
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
              <Tv2 className="size-3" />
              Movies
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
              <Gamepad2 className="size-3" />
              Gaming
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
              <Monitor className="size-3" />
              Desktop
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
