'use client'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { isLocalhost } from '@/lib/config'
import { apiGet, apiPost } from '@/lib/api/client'
import type { PerformanceMetrics, VolumeState } from '@/lib/types/desktop.types'
import { AlertCircle, Cpu, Monitor, RefreshCw, Volume2, HardDrive, Laptop } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function DesktopControls() {
  const [volume, setVolume] = useState<VolumeState | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    // Check if desktop features are available
    setAvailable(isLocalhost || typeof window !== 'undefined')
    if (available) {
      fetchData()
    }
  }, [available])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [volResponse, perfResponse] = await Promise.all([
        apiGet<VolumeState>('/api/desktop/volume').catch(() => null),
        apiGet<PerformanceMetrics>('/api/desktop/performance').catch(() => null),
      ])

      if (volResponse?.success && volResponse.data) {
        setVolume(volResponse.data)
      }

      if (perfResponse?.success && perfResponse.data) {
        setPerformance(perfResponse.data)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load desktop data'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleVolumeChange = async (newVolume: number[]) => {
    const vol = newVolume[0]
    setVolume(prev =>
      prev ? { ...prev, volume: vol ?? 0 } : { volume: vol ?? 0, muted: false }
    )
    try {
      const response = await apiPost('/api/desktop/volume', { volume: vol })
      if (!response.success) throw new Error('Failed to set volume')
    } catch (error) {
      toast.error('Failed to set volume')
      fetchData() // Revert
    }
  }

  const handleSwitchDisplay = async () => {
    try {
      const response = await apiPost('/api/desktop/display/switch')
      if (!response.success) throw new Error('Failed to switch display')
      toast.success('Display switched')
    } catch (error) {
      toast.error('Failed to switch display')
    }
  }

  if (!available) {
    return null // Don't show if not on localhost
  }

  if (error && !volume && !performance) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm  h-full">
        <div className="flex items-center gap-2">
          <Laptop className="size-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Desktop</h3>
        </div>
        <div className="mt-4 flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="size-4" />
          <p className="text-sm">Desktop controls unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm  h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Laptop className="size-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-foreground">Desktop</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Volume Control */}
        {volume && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Volume</span>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {volume.volume}%
              </span>
            </div>
            <Slider
              value={[volume.volume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Performance Stats */}
        {performance && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Cpu className="size-3.5 text-blue-500" />
                  <span className="text-muted-foreground">CPU</span>
                </div>
                <span className="font-medium tabular-nums">
                  {Math.round(performance.cpu.usage)}%
                </span>
              </div>
              <Progress
                value={performance.cpu.usage}
                className="h-1.5"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="size-3.5 text-green-500" />
                  <span className="text-muted-foreground">Memory</span>
                </div>
                <span className="font-medium tabular-nums">
                  {Math.round(performance.memory.usage)}%
                </span>
              </div>
              <Progress
                value={performance.memory.usage}
                className="h-1.5"
              />
            </div>
          </div>
        )}

        {/* Display Switch */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitchDisplay}
          className="w-full gap-2 mt-2"
        >
          <Monitor className="size-4" />
          Switch Display
        </Button>
      </div>
    </div>
  )
}
