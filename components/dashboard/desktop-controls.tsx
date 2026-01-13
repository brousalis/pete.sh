'use client'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { isLocalhost } from '@/lib/config'
import type { PerformanceMetrics, VolumeState } from '@/lib/types/desktop.types'
import { AlertCircle, Cpu, Monitor, RefreshCw, Volume2 } from 'lucide-react'
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
        fetch('/api/desktop/volume').catch(() => null),
        fetch('/api/desktop/performance').catch(() => null),
      ])

      if (volResponse?.ok) {
        const volData = await volResponse.json()
        if (volData.success) {
          setVolume(volData.data)
        }
      }

      if (perfResponse?.ok) {
        const perfData = await perfResponse.json()
        if (perfData.success) {
          setPerformance(perfData.data)
        }
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
      const response = await fetch('/api/desktop/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: vol }),
      })
      if (!response.ok) throw new Error('Failed to set volume')
    } catch (error) {
      toast.error('Failed to set volume')
      fetchData() // Revert
    }
  }

  const handleSwitchDisplay = async () => {
    try {
      const response = await fetch('/api/desktop/display/switch', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to switch display')
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
      <div className="bg-background ring-border rounded-xl p-4 ring-1">
        <div className="text-destructive flex items-center gap-2">
          <AlertCircle className="size-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background ring-border space-y-4 rounded-xl p-4 ring-1">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-semibold">Desktop Controls</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {volume && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              Volume: {volume.volume}%
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

      {performance && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="text-muted-foreground size-4" />
            <span className="text-foreground text-sm font-medium">
              Performance
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">CPU: </span>
              <span className="font-medium">
                {Math.round(performance.cpu.usage)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Memory: </span>
              <span className="font-medium">
                {Math.round(performance.memory.usage)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleSwitchDisplay}
        className="w-full gap-2"
      >
        <Monitor className="size-4" />
        Switch Display (DP → HDMI)
      </Button>
    </div>
  )
}
