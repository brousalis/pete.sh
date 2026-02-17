'use client'

import { Card, CardContent } from '@/components/ui/card'
import { apiGet } from '@/lib/api/client'
import type { Concert, ConcertListResponse, ConcertStats } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { differenceInDays, format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Calendar, ChevronRight, MapPin, Music, Ticket } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ConcertWidgetProps {
  className?: string
}

export function ConcertWidget({ className }: ConcertWidgetProps) {
  const [nextConcert, setNextConcert] = useState<Concert | null>(null)
  const [stats, setStats] = useState<ConcertStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [concertsRes, statsRes] = await Promise.all([
          apiGet<ConcertListResponse>('/api/concerts?status=upcoming&sort=date_asc&limit=1'),
          apiGet<{ stats: ConcertStats }>('/api/concerts/stats'),
        ])

        if (concertsRes.success && concertsRes.data?.concerts?.[0]) {
          setNextConcert(concertsRes.data.concerts[0])
        }
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch concert widget data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href="/concerts">
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Card className={cn('group transition-colors hover:bg-muted/30', className)}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-brand/10 flex size-8 items-center justify-center rounded-lg">
                  <Ticket className="text-brand size-4" />
                </div>
                <span className="text-sm font-semibold">Concerts</span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
            </div>

            {/* Next concert */}
            {nextConcert ? (
              <NextConcertPreview concert={nextConcert} />
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Music className="size-4" />
                <span className="text-sm">No upcoming shows</span>
              </div>
            )}

            {/* Mini stats */}
            {stats && stats.concerts_this_year > 0 && (
              <div className="mt-3 border-t pt-2">
                <p className="text-muted-foreground text-xs">
                  {stats.concerts_this_year} show{stats.concerts_this_year !== 1 ? 's' : ''} this year
                  {stats.total_attended > stats.concerts_this_year && (
                    <span> · {stats.total_attended} total</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}

function NextConcertPreview({ concert }: { concert: Concert }) {
  const eventDate = parseISO(concert.event_date)
  const daysUntil = differenceInDays(eventDate, new Date())

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="truncate font-semibold">{concert.artist_name}</p>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
          daysUntil <= 3
            ? 'bg-brand/10 text-brand'
            : 'bg-muted text-muted-foreground'
        )}>
          {daysUntil === 0
            ? 'Tonight!'
            : daysUntil === 1
              ? 'Tomorrow'
              : `${daysUntil} days`}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          {format(eventDate, 'MMM d')}
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="size-3" />
          <span className="truncate">{concert.venue_name}</span>
        </div>
      </div>
    </div>
  )
}
