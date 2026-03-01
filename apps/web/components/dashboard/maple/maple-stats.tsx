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
  Route,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface MapleStatsProps {
  className?: string
  stats?: MapleStats | null
  loading?: boolean
}

// Compact stats strip for dashboard header - receives stats as prop
export function MapleStatsStrip({
  stats,
  loading,
  className,
}: {
  stats: MapleStats | null
  loading: boolean
  className?: string
}) {
  if (loading) {
    return (
      <div className={cn('flex flex-wrap items-center gap-4', className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-16" />
        ))}
      </div>
    )
  }
  if (!stats) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-4 text-sm', className)}>
      <span className="flex items-center gap-1.5">
        <Footprints className="size-4 text-blue-500" />
        <strong>{stats.totalWalks}</strong>
        <span className="text-muted-foreground">walks</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="flex items-center gap-1.5">
        <Route className="size-4 text-green-500" />
        <strong>{stats.totalDistanceMiles.toFixed(1)}</strong>
        <span className="text-muted-foreground">mi</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="flex items-center gap-1.5">
        <Clock className="size-4 text-purple-500" />
        <strong>{Math.round(stats.avgDurationMinutes)}</strong>
        <span className="text-muted-foreground">m avg</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="flex items-center gap-1.5">
        <Calendar className="size-4 text-orange-500" />
        <strong>{stats.thisWeekWalks}</strong>
        <span className="text-muted-foreground">this week</span>
      </span>
    </div>
  )
}

export function MapleStatsCards({
  className,
  stats: statsProp,
  loading: loadingProp,
}: MapleStatsProps) {
  const [stats, setStats] = useState<MapleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const useProps = statsProp !== undefined

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
    if (!useProps) fetchStats()
  }, [fetchStats, useProps])

  const displayStats = useProps ? statsProp : stats
  const displayLoading = useProps ? (loadingProp ?? false) : loading

  if (displayLoading) {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (!displayStats) return null

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
            <Footprints className="size-5" />
          </div>
          <div>
            <p className="text-xl font-bold">{displayStats.totalWalks}</p>
            <p className="text-xs text-muted-foreground">Total Walks</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-lg bg-green-500/10 p-2 text-green-500">
            <Route className="size-5" />
          </div>
          <div>
            <p className="text-xl font-bold">{displayStats.totalDistanceMiles.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Miles Walked</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-xl font-bold">{Math.round(displayStats.avgDurationMinutes)}</p>
            <p className="text-xs text-muted-foreground">Avg Minutes</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
            <Calendar className="size-5" />
          </div>
          <div>
            <p className="text-xl font-bold">{displayStats.thisWeekWalks}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Mood breakdown component - accepts stats as prop to avoid duplicate fetch
export function MapleMoodBreakdown({
  className,
  stats: statsProp,
  loading: loadingProp,
}: {
  className?: string
  stats?: MapleStats | null
  loading?: boolean
} = {}) {
  const [stats, setStats] = useState<MapleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const useProps = statsProp !== undefined

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
    if (!useProps) fetchStats()
  }, [fetchStats, useProps])

  const displayStats = useProps ? statsProp : stats
  const displayLoading = useProps ? (loadingProp ?? false) : loading

  if (displayLoading) {
    return <Skeleton className={cn('h-32', className)} />
  }

  if (!displayStats || displayStats.totalWalks === 0) return null

  const { moodBreakdown } = displayStats
  const totalWithMood = moodBreakdown.happy + moodBreakdown.neutral + moodBreakdown.sad

  if (totalWithMood === 0) return null

  const moods = [
    { key: 'happy' as const, count: moodBreakdown.happy },
    { key: 'neutral' as const, count: moodBreakdown.neutral },
    { key: 'sad' as const, count: moodBreakdown.sad },
  ].filter((m) => m.count > 0)

  return (
    <Card className={className}>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-base">🐕</span>
          How Maple&apos;s Been
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-2">
        <div className="flex h-6 overflow-hidden rounded-full">
          {moods.map((mood) => {
            const percentage = (mood.count / totalWithMood) * 100
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
                  <span className="text-xs font-medium text-white">{MOOD_EMOJI[mood.key]}</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-center gap-4">
          {moods.map((mood) => {
            const percentage = Math.round((mood.count / totalWithMood) * 100)
            const colors = MOOD_COLORS[mood.key]
            return (
              <div key={mood.key} className="flex items-center gap-1.5">
                <span className="text-base">{MOOD_EMOJI[mood.key]}</span>
                <div>
                  <p className={cn('text-sm font-medium', colors.text)}>{mood.count}</p>
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
