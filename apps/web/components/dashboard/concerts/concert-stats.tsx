'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ConcertStats } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Flame,
  MapPin,
  Music,
  Star,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'

interface ConcertStatsBarProps {
  stats: ConcertStats | null
  loading?: boolean
  className?: string
}

export function ConcertStatsBar({ stats, loading, className }: ConcertStatsBarProps) {
  if (loading || !stats) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  const metrics = [
    {
      icon: Ticket,
      label: 'Shows',
      value: stats.total_attended,
      color: 'text-brand',
      bg: 'bg-brand/10',
    },
    {
      icon: Music,
      label: 'Artists',
      value: stats.unique_artists,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      icon: MapPin,
      label: 'Venues',
      value: stats.unique_venues,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Star,
      label: 'Avg Rating',
      value: stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: DollarSign,
      label: 'Total Spent',
      value: stats.total_spent > 0 ? `$${Math.round(stats.total_spent)}` : '—',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      icon: Flame,
      label: 'Streak',
      value: `${stats.current_streak}mo`,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
  ]

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6', className)}>
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="border-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-3">
              <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', metric.bg)}>
                <metric.icon className={cn('size-4', metric.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{metric.value}</p>
                <p className="text-muted-foreground text-xs">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

interface ConcertStatsDetailProps {
  stats: ConcertStats | null
  className?: string
}

export function ConcertStatsDetail({ stats, className }: ConcertStatsDetailProps) {
  if (!stats) return null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top venue & artist */}
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.top_venue && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MapPin className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Most Visited Venue</p>
                <p className="font-semibold">{stats.top_venue}</p>
                <p className="text-muted-foreground text-xs">
                  {stats.top_venue_count} {stats.top_venue_count === 1 ? 'visit' : 'visits'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.top_artist && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Users className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Most Seen Artist</p>
                <p className="font-semibold">{stats.top_artist}</p>
                <p className="text-muted-foreground text-xs">
                  {stats.top_artist_count} {stats.top_artist_count === 1 ? 'time' : 'times'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Streaks */}
      {(stats.current_streak > 0 || stats.longest_streak > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.current_streak > 0 && (
            <Badge variant="secondary" className="gap-1 bg-orange-500/10 text-orange-600">
              <Flame className="size-3" />
              {stats.current_streak} month streak
            </Badge>
          )}
          {stats.longest_streak > 0 && stats.longest_streak !== stats.current_streak && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="size-3" />
              Best: {stats.longest_streak} months
            </Badge>
          )}
          {stats.total_upcoming > 0 && (
            <Badge variant="secondary" className="bg-brand/10 text-brand gap-1">
              <Ticket className="size-3" />
              {stats.total_upcoming} upcoming
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
