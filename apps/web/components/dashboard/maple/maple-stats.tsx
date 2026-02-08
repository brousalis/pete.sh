'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api/client'
import type { MapleStats } from '@/lib/types/maple.types'
import { MOOD_COLORS, MOOD_EMOJI } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import {
    Calendar,
    Clock,
    Footprints,
    Route
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface MapleStatsProps {
  className?: string
}

export function MapleStatsCards({ className }: MapleStatsProps) {
  const [stats, setStats] = useState<MapleStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiGet<MapleStats>('/api/maple/stats')
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Total Walks */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
            <Footprints className="size-6" />
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.totalWalks}</p>
            <p className="text-sm text-muted-foreground">Total Walks</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Distance */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-green-500/10 p-3 text-green-500">
            <Route className="size-6" />
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.totalDistanceMiles.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Miles Walked</p>
          </div>
        </CardContent>
      </Card>

      {/* Average Duration */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-purple-500/10 p-3 text-purple-500">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-3xl font-bold">{Math.round(stats.avgDurationMinutes)}</p>
            <p className="text-sm text-muted-foreground">Avg Minutes</p>
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-orange-500/10 p-3 text-orange-500">
            <Calendar className="size-6" />
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.thisWeekWalks}</p>
            <p className="text-sm text-muted-foreground">This Week</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Mood breakdown component
export function MapleMoodBreakdown({ className }: { className?: string }) {
  const [stats, setStats] = useState<MapleStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiGet<MapleStats>('/api/maple/stats')
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return <Skeleton className={cn('h-40', className)} />
  }

  if (!stats || stats.totalWalks === 0) {
    return null
  }

  const { moodBreakdown, totalWalks } = stats
  const totalWithMood = moodBreakdown.happy + moodBreakdown.neutral + moodBreakdown.sad

  if (totalWithMood === 0) {
    return null
  }

  const moods = [
    { key: 'happy' as const, count: moodBreakdown.happy },
    { key: 'neutral' as const, count: moodBreakdown.neutral },
    { key: 'sad' as const, count: moodBreakdown.sad },
  ].filter((m) => m.count > 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-lg">🐕</span>
          How Maple's Been
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar chart */}
        <div className="flex h-8 overflow-hidden rounded-full">
          {moods.map((mood) => {
            const percentage = (mood.count / totalWithMood) * 100
            const colors = MOOD_COLORS[mood.key]
            return (
              <div
                key={mood.key}
                className={cn(
                  'flex items-center justify-center transition-all',
                  mood.key === 'happy' && 'bg-green-500',
                  mood.key === 'neutral' && 'bg-yellow-500',
                  mood.key === 'sad' && 'bg-orange-500'
                )}
                style={{ width: `${percentage}%` }}
                title={`${mood.key}: ${mood.count} walks (${Math.round(percentage)}%)`}
              >
                {percentage > 15 && (
                  <span className="text-sm font-medium text-white">{MOOD_EMOJI[mood.key]}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6">
          {moods.map((mood) => {
            const percentage = Math.round((mood.count / totalWithMood) * 100)
            const colors = MOOD_COLORS[mood.key]
            return (
              <div key={mood.key} className="flex items-center gap-2">
                <span className="text-lg">{MOOD_EMOJI[mood.key]}</span>
                <div>
                  <p className={cn('font-medium', colors.text)}>{mood.count}</p>
                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Combined stats overview for dashboard hero
export function MapleStatsOverview({ className }: { className?: string }) {
  const [stats, setStats] = useState<MapleStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiGet<MapleStats>('/api/maple/stats')
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className={cn('flex items-center gap-6', className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-20" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-6', className)}>
      <div className="text-center">
        <p className="text-3xl font-bold">{stats.totalWalks}</p>
        <p className="text-xs text-muted-foreground">Walks</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="text-center">
        <p className="text-3xl font-bold">{stats.totalDistanceMiles.toFixed(1)}</p>
        <p className="text-xs text-muted-foreground">Miles</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="text-center">
        <p className="text-3xl font-bold">{Math.round(stats.totalDurationMinutes / 60)}</p>
        <p className="text-xs text-muted-foreground">Hours</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="text-center">
        <p className="text-3xl font-bold">{stats.thisMonthWalks}</p>
        <p className="text-xs text-muted-foreground">This Month</p>
      </div>
    </div>
  )
}

// Compact stat for use in cards
export function MapleStatBadge({
  icon: Icon,
  value,
  label,
  iconColor = 'text-primary',
}: {
  icon: typeof Footprints
  value: string | number
  label: string
  iconColor?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('size-4', iconColor)} />
      <div>
        <span className="font-semibold">{value}</span>
        <span className="ml-1 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
