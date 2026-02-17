'use client'

import type { Concert } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ConcertCard } from './concert-card'

interface ConcertTimelineProps {
  concerts: Concert[]
  className?: string
}

export function ConcertTimeline({ concerts, className }: ConcertTimelineProps) {
  // Group concerts by year
  const grouped = groupByYear(concerts)
  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)

  // Separate upcoming from past within each year
  const upcomingConcerts = concerts.filter((c) => c.status === 'upcoming')
  const pastConcerts = concerts.filter((c) => c.status !== 'upcoming')
  const pastGrouped = groupByYear(pastConcerts)
  const pastYears = Object.keys(pastGrouped)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className={cn('relative', className)}>
      {/* Timeline center line - desktop only */}
      <div className="bg-border/50 absolute left-4 top-0 hidden h-full w-px md:left-1/2 md:block md:-translate-x-px" />

      {/* Upcoming section */}
      {upcomingConcerts.length > 0 && (
        <div className="mb-8">
          <TimelineYearDivider label="Upcoming" isUpcoming />
          <div className="space-y-4">
            {upcomingConcerts
              .sort((a, b) => a.event_date.localeCompare(b.event_date))
              .map((concert, index) => (
                <TimelineItem
                  key={concert.id}
                  concert={concert}
                  index={index}
                  side={index % 2 === 0 ? 'left' : 'right'}
                  isUpcoming
                />
              ))}
          </div>
        </div>
      )}

      {/* Past concerts grouped by year */}
      {pastYears.map((year) => (
        <div key={year} className="mb-8">
          <TimelineYearDivider label={String(year)} />
          <div className="space-y-4">
            {(pastGrouped[year] ?? [])
              .sort((a, b) => b.event_date.localeCompare(a.event_date))
              .map((concert, index) => (
                <TimelineItem
                  key={concert.id}
                  concert={concert}
                  index={index}
                  side={index % 2 === 0 ? 'left' : 'right'}
                />
              ))}
          </div>
        </div>
      ))}

      {concerts.length === 0 && (
        <EmptyTimeline />
      )}
    </div>
  )
}

function TimelineItem({
  concert,
  index,
  side,
  isUpcoming,
}: {
  concert: Concert
  index: number
  side: 'left' | 'right'
  isUpcoming?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative"
    >
      {/* Timeline dot - desktop */}
      <div className="absolute left-4 top-4 z-10 hidden md:left-1/2 md:block md:-translate-x-1/2">
        <div
          className={cn(
            'size-3 rounded-full border-2',
            isUpcoming
              ? 'animate-pulse border-brand bg-brand'
              : 'border-border bg-background'
          )}
        />
      </div>

      {/* Card with alternating sides on desktop */}
      <div
        className={cn(
          'relative',
          // Mobile: full width
          'w-full',
          // Desktop: half width, alternating
          'md:w-[calc(50%-1.5rem)]',
          side === 'left' ? 'md:mr-auto md:pr-4' : 'md:ml-auto md:pl-4'
        )}
      >
        <ConcertCard concert={concert} />
      </div>
    </motion.div>
  )
}

function TimelineYearDivider({
  label,
  isUpcoming,
}: {
  label: string
  isUpcoming?: boolean
}) {
  return (
    <div className="relative mb-6 flex items-center justify-center">
      <div className="bg-border/50 absolute inset-x-0 h-px" />
      <span
        className={cn(
          'relative z-10 rounded-full px-4 py-1 text-sm font-semibold',
          isUpcoming
            ? 'bg-brand text-brand-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
        <svg
          className="text-muted-foreground size-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold">No concerts yet</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Add your first concert or sync from your calendar to get started
      </p>
    </div>
  )
}

function groupByYear(concerts: Concert[]): Record<number, Concert[]> {
  const groups: Record<number, Concert[]> = {}
  for (const concert of concerts) {
    const year = new Date(concert.event_date).getFullYear()
    if (!groups[year]) groups[year] = []
    groups[year].push(concert)
  }
  return groups
}
