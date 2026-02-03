'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { apiGet, apiPost } from '@/lib/api/client'
import type { HueZone } from '@/lib/types/hue.types'
import { AlertCircle, Lightbulb, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function HomeEnvironmentCard() {
  const [zones, setZones] = useState<HueZone[]>([])
  const [zoneBrightness, setZoneBrightness] = useState<Record<string, number>>(
    {}
  )
  const [loading, setLoading] = useState(true)
  const [lightsError, setLightsError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)

    // Fetch HUE zones
    try {
      const response = await apiGet<Record<string, HueZone>>('/api/hue/zones')
      if (!response.success) {
        if (response.code === 'NOT_CONFIGURED') {
          setLightsError('HUE bridge not configured')
        }
      } else if (response.data) {
        const zonesArray = Object.entries(response.data).map(([id, zone]) => ({
          ...(zone as HueZone),
          id,
        }))
        setZones(zonesArray)
        setLightsError(null)

        // Initialize brightness values
        const brightnessMap: Record<string, number> = {}
        zonesArray.forEach(zone => {
          // Default to 100% if on, 50% if off
          brightnessMap[zone.id] = zone.state?.any_on ? 100 : 50
        })
        setZoneBrightness(brightnessMap)
      }
    } catch {
      setLightsError('Failed to load lights')
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleZone = async (zoneId: string, on: boolean) => {
    // Optimistic update
    setZones(prev =>
      prev.map(z =>
        z.id === zoneId
          ? { ...z, state: { ...z.state, any_on: on, all_on: on } }
          : z
      )
    )

    try {
      const response = await apiPost(`/api/hue/zones/${zoneId}/toggle`, { on })
      if (!response.success) throw new Error()
    } catch {
      // Revert on error
      setZones(prev =>
        prev.map(z =>
          z.id === zoneId
            ? { ...z, state: { ...z.state, any_on: !on, all_on: !on } }
            : z
        )
      )
      toast.error('Failed to toggle lights')
    }
  }

  const handleBrightnessChange = async (zoneId: string, brightness: number) => {
    setZoneBrightness(prev => ({ ...prev, [zoneId]: brightness }))

    try {
      // Convert 0-100 to 0-254 for Hue API
      const hueBrightness = Math.round((brightness / 100) * 254)
      await apiPost(`/api/hue/zones/${zoneId}/brightness`, {
        brightness: hueBrightness,
      })
    } catch {
      // Silent fail for brightness - it's a frequent operation
    }
  }

  // Count active zones
  const activeZones = zones.filter(z => z.state?.any_on).length

  return (
    <div className="space-y-4">
      <DashboardCardHeader
        icon={
          <Lightbulb className="size-5 text-amber-500 dark:text-amber-400" />
        }
        iconContainerClassName="bg-amber-500/10"
        title="Lights"
        badge={
          zones.length > 0 ? (
            <span className="bg-brand/20 text-brand rounded-full px-1.5 text-xs font-medium">
              {zones.length}
            </span>
          ) : undefined
        }
        viewHref="/lights"
        viewLabel="View"
        onRefresh={fetchData}
        refreshing={loading}
      />

      {/* Lights */}
      <div className="space-y-2">
        {lightsError ? (
          <div className="bg-muted/20 flex flex-col items-center justify-center rounded-xl p-6 text-center">
            <AlertCircle className="text-muted-foreground/50 size-8" />
            <p className="text-muted-foreground mt-2 text-sm">{lightsError}</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="bg-muted/20 flex flex-col items-center justify-center rounded-xl p-6 text-center">
            <Lightbulb className="text-muted-foreground/50 size-8" />
            <p className="text-muted-foreground mt-2 text-sm">
              No light zones found
            </p>
          </div>
        ) : (
          zones.map(zone => {
            const isOn = zone.state?.any_on
            const brightness = zoneBrightness[zone.id] ?? 50

            return (
              <div
                key={zone.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  isOn
                    ? 'border-brand/30 bg-brand/5'
                    : 'border-border bg-card/50'
                }`}
              >
                {/* Toggle */}
                <Switch
                  checked={isOn}
                  onCheckedChange={checked =>
                    handleToggleZone(zone.id, checked)
                  }
                />

                {/* Zone Name */}
                <span
                  className={`min-w-[80px] text-sm font-medium ${isOn ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {zone.name}
                </span>

                {/* Brightness Slider */}
                <div className="flex flex-1 items-center gap-2">
                  <Sun
                    className={`size-3.5 ${isOn ? 'text-brand' : 'text-muted-foreground/50'}`}
                  />
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) =>
                      handleBrightnessChange(zone.id, v ?? 50)
                    }
                    min={1}
                    max={100}
                    step={5}
                    disabled={!isOn}
                    className="flex-1"
                  />
                  <span
                    className={`w-8 text-right text-xs tabular-nums ${isOn ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}
                  >
                    {brightness}%
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
