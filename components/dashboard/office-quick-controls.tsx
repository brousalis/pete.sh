'use client'

import { Slider } from '@/components/ui/slider'
import { apiGet, apiPost } from '@/lib/api/client'
import type { HueScene, HueZone } from '@/lib/types/hue.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Lightbulb, Power, Sun } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Office zone identifier - matches by name containing "office" (case-insensitive)
const OFFICE_ZONE_NAME = 'office'

// Specific scenes to show in order (case-insensitive match)
const PREFERRED_SCENES = ['pete red', 'pete work', 'purple rain']

// Display labels for scenes (lowercase key -> display label)
const SCENE_LABELS: Record<string, string> = {
  'pete red': 'Red',
  'pete work': 'Work',
  'purple rain': 'Purple',
}

export function OfficeQuickControls() {
  const [zone, setZone] = useState<HueZone | null>(null)
  const [scenes, setScenes] = useState<HueScene[]>([])
  const [brightness, setBrightness] = useState(100)
  const [isOn, setIsOn] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const brightnessTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch zone and scenes on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all zones
        const zonesRes = await apiGet<Record<string, HueZone>>('/api/hue/zones')
        if (!zonesRes.success || !zonesRes.data) {
          setError('Could not load zones')
          setLoading(false)
          return
        }

        // Find office zone
        const zonesArray = Object.entries(zonesRes.data).map(([id, z]) => ({
          ...z,
          id,
        }))
        const officeZone = zonesArray.find(z =>
          z.name.toLowerCase().includes(OFFICE_ZONE_NAME)
        )

        if (!officeZone) {
          setError('Office zone not found')
          setLoading(false)
          return
        }

        setZone(officeZone)
        setIsOn(officeZone.state?.any_on ?? false)

        // Calculate average brightness from zone action or default
        if (officeZone.action?.bri) {
          setBrightness(Math.round((officeZone.action.bri / 254) * 100))
        }

        // Fetch scenes for this zone
        const scenesRes = await apiGet<HueScene[]>(
          `/api/hue/zones/${officeZone.id}/scenes`
        )
        if (scenesRes.success && scenesRes.data) {
          // Filter to preferred scenes and maintain order
          const filteredScenes = PREFERRED_SCENES.map(preferred => {
            return scenesRes.data!.find(
              s => s.name.toLowerCase() === preferred.toLowerCase()
            )
          }).filter((s): s is HueScene => s !== undefined)

          setScenes(filteredScenes)
        }

        setLoading(false)
      } catch {
        setError('Failed to load')
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Toggle power
  const handleToggle = useCallback(async () => {
    if (!zone) return

    const newState = !isOn
    setIsOn(newState)

    try {
      await apiPost(`/api/hue/zones/${zone.id}/toggle`, { on: newState })
    } catch {
      setIsOn(!newState) // Revert on error
    }
  }, [zone, isOn])

  // Activate scene
  const handleSceneActivate = useCallback(
    async (sceneId: string) => {
      if (!zone) return

      setActiveSceneId(sceneId)
      setIsOn(true)

      try {
        await apiPost(`/api/hue/zones/${zone.id}/scenes/${sceneId}`, {})
      } catch {
        // Scene may still have been activated, keep optimistic state
      }
    },
    [zone]
  )

  // Brightness change with debounce
  const handleBrightnessChange = useCallback(
    (value: number[]) => {
      const bri = value[0] ?? 100
      setBrightness(bri)

      // If lights are off and user adjusts brightness, turn them on
      if (!isOn && bri > 0) {
        setIsOn(true)
      }

      // Clear existing timeout
      if (brightnessTimeoutRef.current) {
        clearTimeout(brightnessTimeoutRef.current)
      }

      // Debounce API call
      brightnessTimeoutRef.current = setTimeout(async () => {
        if (!zone) return
        try {
          const hueBrightness = Math.round((bri / 100) * 254)
          await apiPost(`/api/hue/zones/${zone.id}/brightness`, {
            brightness: hueBrightness,
          })
        } catch {
          // Silent fail for brightness
        }
      }, 150)
    },
    [zone, isOn]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (brightnessTimeoutRef.current) {
        clearTimeout(brightnessTimeoutRef.current)
      }
    }
  }, [])

  // Don't render if loading or error
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 backdrop-blur-sm">
        <div className="size-4 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
      </div>
    )
  }

  if (error || !zone) {
    return null // Silently hide if not available
  }

  return (
    <motion.div
      className="flex flex-col gap-2 rounded-xl bg-white/5 px-4 py-3 backdrop-blur-sm"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.35 }}
    >
      {/* Header: Icon + Label + Power Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex size-7 items-center justify-center rounded-lg transition-colors',
              isOn ? 'bg-amber-500/20' : 'bg-white/10'
            )}
          >
            <Lightbulb
              className={cn(
                'size-4 transition-colors',
                isOn ? 'text-amber-400' : 'text-white/40'
              )}
            />
          </div>
          <span className="text-xs font-medium text-white/70">Office</span>
        </div>

        {/* Power button */}
        <button
          onClick={handleToggle}
          className={cn(
            'flex size-7 items-center justify-center rounded-full transition-all',
            'hover:scale-105 active:scale-95',
            isOn
              ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/40'
              : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white/60'
          )}
          aria-label={isOn ? 'Turn off office lights' : 'Turn on office lights'}
        >
          <Power className="size-3.5" />
        </button>
      </div>

      {/* Scene Pills */}
      {scenes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scenes.map(scene => {
            const isActive = activeSceneId === scene.id && isOn
            const label = SCENE_LABELS[scene.name.toLowerCase()] || scene.name

            return (
              <button
                key={scene.id}
                onClick={() => handleSceneActivate(scene.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium transition-all',
                  'hover:scale-105 active:scale-95',
                  isActive
                    ? 'bg-brand/30 text-brand ring-brand/40 ring-1'
                    : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Brightness Slider */}
      <div className="flex items-center gap-2">
        <Sun
          className={cn(
            'size-3 shrink-0 transition-colors',
            isOn ? 'text-white/50' : 'text-white/20'
          )}
        />
        <Slider
          value={[brightness]}
          onValueChange={handleBrightnessChange}
          min={1}
          max={100}
          step={5}
          disabled={!isOn}
          className="flex-1 [&_[data-slot=slider-range]]:bg-amber-400/60 [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-amber-400 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/10"
        />
        <span
          className={cn(
            'w-7 text-right text-[10px] font-medium tabular-nums',
            isOn ? 'text-white/50' : 'text-white/20'
          )}
        >
          {brightness}%
        </span>
      </div>
    </motion.div>
  )
}
