'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { MapleWalk, MapleWalkWithDetails } from '@/lib/types/maple.types'
import { formatWalkDistance, formatWalkDuration } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Clock, Flame, Heart, Route } from 'lucide-react'
import { MapleMoodBadge } from './maple-mood-rating'

interface MapleWalkCardProps {
  walk: MapleWalk | MapleWalkWithDetails
  onClick?: () => void
  isSelected?: boolean
  compact?: boolean
}

function formatWalkDate(dateStr: string, compact = false): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return compact ? format(date, 'EEE, MMM d') : format(date, 'EEEE, MMM d')
}

function formatWalkTime(dateStr: string): string {
  const date = parseISO(dateStr)
  return format(date, 'h:mm a')
}

function isWalkWithDetails(walk: MapleWalk | MapleWalkWithDetails): walk is MapleWalkWithDetails {
  return 'workout' in walk
}

export function MapleWalkCard({
  walk,
  onClick,
  isSelected = false,
  compact = false,
}: MapleWalkCardProps) {
  const hasWorkout = isWalkWithDetails(walk) && walk.workout

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary ring-offset-2',
          compact ? 'p-3' : 'p-4'
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className={cn('flex items-start', compact ? 'gap-3' : 'gap-4')}>
            <div className="shrink-0">
              <MapleMoodBadge mood={walk.moodRating} size={compact ? 'sm' : 'md'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
                  {walk.title || formatWalkDate(walk.date, compact)}
                </h3>
              </div>
              {walk.title && (
                <p className={cn('text-xs text-muted-foreground', compact ? 'mb-1' : 'mb-2')}>
                  {formatWalkDate(walk.date, compact)}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Duration */}
                {walk.duration && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                      {formatWalkDuration(walk.duration)}
                    </span>
                  </div>
                )}

                {/* Distance */}
                {walk.distanceMiles && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Route className="size-3.5" />
                    <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                      {formatWalkDistance(walk.distanceMiles)}
                    </span>
                  </div>
                )}

                {/* Heart Rate (if available) */}
                {hasWorkout && walk.workout?.hrAverage && (
                  <div className="flex items-center gap-1 text-accent-rose">
                    <Heart className="size-3.5" />
                    <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                      {Math.round(walk.workout.hrAverage)} bpm
                    </span>
                  </div>
                )}

                {/* Calories (if available) */}
                {hasWorkout && walk.workout?.activeCalories && (
                  <div className="flex items-center gap-1 text-accent-ember">
                    <Flame className="size-3.5" />
                    <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                      {Math.round(walk.workout.activeCalories)} cal
                    </span>
                  </div>
                )}

                {/* Bathroom marker counts */}
                {walk.bathroomMarkerCounts && (walk.bathroomMarkerCounts.pee > 0 || walk.bathroomMarkerCounts.poop > 0) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {walk.bathroomMarkerCounts.pee > 0 && (
                      <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                        💧{walk.bathroomMarkerCounts.pee}
                      </span>
                    )}
                    {walk.bathroomMarkerCounts.poop > 0 && (
                      <span className={cn(compact ? 'text-xs' : 'text-sm')}>
                        💩{walk.bathroomMarkerCounts.poop}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {walk.notes && (
                <p
                  className={cn(
                    'text-sm text-muted-foreground',
                    compact ? 'mt-1 line-clamp-1' : 'mt-2 line-clamp-2'
                  )}
                >
                  {walk.notes}
                </p>
              )}
            </div>

            {/* Time badge */}
            {hasWorkout && walk.workout && (
              <Badge variant="secondary" className="shrink-0">
                {formatWalkTime(walk.workout.startDate)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Skeleton loader for walk card
export function MapleWalkCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? 'p-3' : 'p-4'}>
      <CardContent className="p-0">
        <div className="flex items-start gap-4">
          <Skeleton className={cn('shrink-0 rounded-full', compact ? 'size-10' : 'size-14')} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// List of walk cards
export function MapleWalkList({
  walks,
  onWalkClick,
  selectedId,
  loading = false,
  emptyMessage = 'No walks recorded yet',
  compact = false,
}: {
  walks: MapleWalk[]
  onWalkClick?: (walk: MapleWalk) => void
  selectedId?: string
  loading?: boolean
  emptyMessage?: string
  compact?: boolean
}) {
  if (loading) {
    return (
      <div className={cn('space-y-2', !compact && 'space-y-3')}>
        {[...Array(3)].map((_, i) => (
          <MapleWalkCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    )
  }

  if (walks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <span className="mb-2 text-4xl">🐕</span>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Record a walk as &quot;Hiking&quot; on your Apple Watch and sync it first.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', !compact && 'space-y-3')}>
      {walks.map((walk) => (
        <MapleWalkCard
          key={walk.id}
          walk={walk}
          onClick={() => onWalkClick?.(walk)}
          isSelected={walk.id === selectedId}
          compact={compact}
        />
      ))}
    </div>
  )
}
