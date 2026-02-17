'use client'

import { Button } from '@/components/ui/button'
import { ConcertAddDialog } from '@/components/dashboard/concerts/concert-add-dialog'
import { ConcertStatsBar } from '@/components/dashboard/concerts/concert-stats'
import { ConcertTimeline } from '@/components/dashboard/concerts/concert-timeline'
import { ConcertVenueMap } from '@/components/dashboard/concerts/concert-venue-map'
import { apiGet, apiPost } from '@/lib/api/client'
import { fadeUpVariants } from '@/lib/animations'
import type { Concert, ConcertListResponse, ConcertStats } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  CalendarSync,
  Grid3x3,
  List,
  Loader2,
  Map,
  Plus,
  RefreshCw,
  Ticket,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type ViewMode = 'timeline' | 'map' | 'gallery'

export default function ConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [stats, setStats] = useState<ConcertStats | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const fetchConcerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort: 'date_desc', limit: '200' })
      if (selectedYear) params.set('year', String(selectedYear))

      const [concertsRes, statsRes] = await Promise.all([
        apiGet<ConcertListResponse>(`/api/concerts?${params}`),
        apiGet<{ stats: ConcertStats; years: number[] }>('/api/concerts/stats'),
      ])

      if (concertsRes.success && concertsRes.data) {
        setConcerts(concertsRes.data.concerts)
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data.stats)
        setYears(statsRes.data.years)
      }
    } catch (err) {
      console.error('Failed to fetch concerts:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchConcerts()
  }, [fetchConcerts])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await apiPost('/api/concerts/sync-calendar')
      await fetchConcerts()
    } catch (err) {
      console.error('Calendar sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  const handleConcertCreated = (concert: Concert) => {
    setConcerts((prev) => [concert, ...prev])
    fetchConcerts() // Refresh stats
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="bg-brand/10 flex size-12 items-center justify-center rounded-xl">
            <Ticket className="text-brand size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Concerts</h1>
            <p className="text-muted-foreground text-sm">
              {stats
                ? `${stats.total_attended} shows attended${stats.total_upcoming > 0 ? ` · ${stats.total_upcoming} upcoming` : ''}`
                : 'Your live music journal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CalendarSync className="mr-2 size-4" />
            )}
            Sync Calendar
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="bg-brand hover:bg-brand/90"
          >
            <Plus className="mr-2 size-4" />
            Add Concert
          </Button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
        <ConcertStatsBar stats={stats} loading={loading} />
      </motion.div>

      {/* Year filter + View toggle */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        {/* Year pills */}
        <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
          <button
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              selectedYear === null
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            onClick={() => setSelectedYear(null)}
          >
            All Time
          </button>
          {years.map((year) => (
            <button
              key={year}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                selectedYear === year
                  ? 'bg-brand text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="bg-muted flex shrink-0 rounded-lg p-0.5">
          {([
            { mode: 'timeline' as ViewMode, icon: List, label: 'Timeline' },
            { mode: 'map' as ViewMode, icon: Map, label: 'Map' },
            { mode: 'gallery' as ViewMode, icon: Grid3x3, label: 'Gallery' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode(mode)}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : viewMode === 'timeline' ? (
          <ConcertTimeline concerts={concerts} />
        ) : viewMode === 'map' ? (
          <ConcertVenueMap
            concerts={concerts}
            height="500px"
            className="overflow-hidden rounded-xl"
          />
        ) : (
          <GalleryView concerts={concerts} />
        )}
      </motion.div>

      {/* Add dialog */}
      <ConcertAddDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={handleConcertCreated}
      />
    </div>
  )
}

/** Gallery view - masonry grid of concert photos */
function GalleryView({ concerts }: { concerts: Concert[] }) {
  const photoConcerts = concerts.filter(
    (c) => c.cover_image || (c.photos && c.photos.length > 0)
  )

  if (photoConcerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Grid3x3 className="text-muted-foreground/50 mb-3 size-8" />
        <h3 className="font-semibold">No photos yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload photos to your concerts to see them here
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {photoConcerts.map((concert) => {
        const imgSrc =
          concert.cover_image ||
          concert.photos?.find((p) => p.is_cover)?.storage_url ||
          concert.photos?.[0]?.storage_url

        if (!imgSrc) return null

        return (
          <Link
            key={concert.id}
            href={`/concerts/${concert.id}`}
            className="group relative aspect-square overflow-hidden rounded-xl"
          >
            <Image
              src={imgSrc}
              alt={concert.artist_name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-sm font-semibold text-white">
                {concert.artist_name}
              </p>
              <p className="truncate text-xs text-white/70">{concert.venue_name}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
