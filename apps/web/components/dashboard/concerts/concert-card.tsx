'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Concert } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { differenceInDays, format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Star, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface ConcertCardProps {
  concert: Concert
  className?: string
}

export function ConcertCard({ concert, className }: ConcertCardProps) {
  const eventDate = parseISO(concert.event_date)
  const isUpcoming = concert.status === 'upcoming'
  const isCancelled = concert.status === 'cancelled'
  const daysUntil = isUpcoming ? differenceInDays(eventDate, new Date()) : null

  const coverPhoto = concert.cover_image
    || concert.photos?.find((p) => p.is_cover)?.storage_url
    || concert.photos?.[0]?.thumbnail_url
    || concert.photos?.[0]?.storage_url

  return (
    <Link href={`/concerts/${concert.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <Card
          className={cn(
            'group relative overflow-hidden transition-all',
            isUpcoming && 'border-brand/20 bg-brand/5',
            isCancelled && 'opacity-60',
            className
          )}
        >
          <CardContent className="p-0">
            <div className="flex gap-0">
              {/* Cover Image */}
              {coverPhoto && (
                <div className="relative h-auto w-24 shrink-0 overflow-hidden sm:w-32">
                  <Image
                    src={coverPhoto}
                    alt={concert.artist_name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="128px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                </div>
              )}

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold sm:text-lg">
                        {concert.artist_name}
                      </h3>
                      {concert.supporting_artists.length > 0 && (
                        <p className="text-muted-foreground truncate text-xs">
                          with {concert.supporting_artists.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isUpcoming && daysUntil !== null && (
                        <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/20 text-xs">
                          {daysUntil === 0
                            ? 'Today!'
                            : daysUntil === 1
                              ? 'Tomorrow'
                              : `${daysUntil}d`}
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge variant="destructive" className="text-xs">
                          Cancelled
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Tour name */}
                  {concert.tour_name && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                      {concert.tour_name}
                    </p>
                  )}
                </div>

                {/* Details */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Calendar className="size-3" />
                    <span>{format(eventDate, 'MMM d, yyyy')}</span>
                  </div>

                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <MapPin className="size-3" />
                    <span className="truncate">{concert.venue_name}</span>
                  </div>

                  {concert.event_start && (
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="size-3" />
                      <span>{format(parseISO(concert.event_start), 'h:mm a')}</span>
                    </div>
                  )}

                  {concert.companions.length > 0 && (
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Users className="size-3" />
                      <span>{concert.companions.length}</span>
                    </div>
                  )}
                </div>

                {/* Bottom row: rating + tags */}
                <div className="mt-2 flex items-center gap-2">
                  {concert.rating && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'size-3',
                            i < concert.rating!
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/30'
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {concert.tags.length > 0 && (
                    <div className="flex gap-1 overflow-hidden">
                      {concert.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-muted-foreground px-1.5 py-0 text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {concert.ticket_cost && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      ${concert.ticket_cost}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}

/** Compact card for timeline/widget use */
export function ConcertCardCompact({ concert }: { concert: Concert }) {
  const eventDate = parseISO(concert.event_date)
  const isUpcoming = concert.status === 'upcoming'
  const daysUntil = isUpcoming ? differenceInDays(eventDate, new Date()) : null

  return (
    <Link href={`/concerts/${concert.id}`}>
      <div className={cn(
        'hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors',
        isUpcoming && 'bg-brand/5'
      )}>
        {/* Date block */}
        <div className={cn(
          'flex size-10 shrink-0 flex-col items-center justify-center rounded-lg text-center',
          isUpcoming ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground'
        )}>
          <span className="text-[10px] font-medium uppercase leading-none">
            {format(eventDate, 'MMM')}
          </span>
          <span className="text-sm font-bold leading-tight">
            {format(eventDate, 'd')}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{concert.artist_name}</p>
          <p className="text-muted-foreground truncate text-xs">{concert.venue_name}</p>
        </div>

        {/* Badge */}
        {isUpcoming && daysUntil !== null && (
          <Badge variant="secondary" className="bg-brand/10 text-brand shrink-0 text-[10px]">
            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
          </Badge>
        )}
        {concert.rating && !isUpcoming && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-xs">{concert.rating}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
