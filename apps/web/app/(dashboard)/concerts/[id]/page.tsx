'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConcertPhotoGallery } from '@/components/dashboard/concerts/concert-photo-gallery'
import { ConcertSetlist } from '@/components/dashboard/concerts/concert-setlist'
import { ConcertSpotifySection } from '@/components/dashboard/concerts/concert-spotify-section'
import { ConcertVenueMap } from '@/components/dashboard/concerts/concert-venue-map'
import { apiGet, apiPut } from '@/lib/api/client'
import { fadeUpVariants } from '@/lib/animations'
import type { Concert, ConcertPhoto, SetlistData } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { differenceInDays, format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { ConcertMemoryCard } from '@/components/dashboard/concerts/concert-memory-card'
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Pencil,
  Plus,
  Star,
  Tag,
  Ticket,
  Users,
  X,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function ConcertDetailPage() {
  const params = useParams()
  const router = useRouter()
  const concertId = params.id as string
  const [concert, setConcert] = useState<Concert | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConcert = useCallback(async () => {
    try {
      const response = await apiGet<Concert>(`/api/concerts/${concertId}`)
      if (response.success && response.data) {
        setConcert(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch concert:', err)
    } finally {
      setLoading(false)
    }
  }, [concertId])

  useEffect(() => {
    fetchConcert()
  }, [fetchConcert])

  const updateField = useCallback(
    async (field: string, value: unknown) => {
      if (!concert) return
      setSaving(true)

      // Optimistic update
      setConcert((prev) => (prev ? { ...prev, [field]: value } : prev))

      try {
        await apiPut(`/api/concerts/${concertId}`, { [field]: value })
      } catch (err) {
        console.error('Failed to update:', err)
        fetchConcert() // Revert on error
      } finally {
        setSaving(false)
      }
    },
    [concert, concertId, fetchConcert]
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!concert) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Ticket className="text-muted-foreground/50 mb-3 size-8" />
        <h2 className="text-lg font-semibold">Concert not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/concerts')}>
          Back to Concerts
        </Button>
      </div>
    )
  }

  const eventDate = parseISO(concert.event_date)
  const isUpcoming = concert.status === 'upcoming'
  const daysUntil = isUpcoming ? differenceInDays(eventDate, new Date()) : null

  const coverPhoto =
    concert.cover_image ||
    concert.photos?.find((p) => p.is_cover)?.storage_url ||
    concert.photos?.[0]?.storage_url

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* Back button + Memory card */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/concerts')}
          className="text-muted-foreground -ml-2"
        >
          <ArrowLeft className="mr-1 size-4" />
          Concerts
        </Button>
        {concert.status === 'attended' && (
          <ConcertMemoryCard concert={concert} />
        )}
      </div>

      {/* Hero Section */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="relative overflow-hidden">
          {/* Background image blur */}
          {coverPhoto && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl"
              style={{ backgroundImage: `url(${coverPhoto})` }}
            />
          )}

          <CardContent className="relative p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                {/* Status + Countdown */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isUpcoming ? 'default' : 'secondary'}
                    className={cn(isUpcoming && 'bg-brand')}
                  >
                    {isUpcoming
                      ? daysUntil === 0
                        ? 'Tonight!'
                        : daysUntil === 1
                          ? 'Tomorrow'
                          : `In ${daysUntil} days`
                      : concert.status === 'cancelled'
                        ? 'Cancelled'
                        : 'Attended'}
                  </Badge>
                  {concert.tour_name && (
                    <Badge variant="outline" className="text-xs">
                      {concert.tour_name}
                    </Badge>
                  )}
                </div>

                {/* Artist name */}
                <h1 className="text-2xl font-bold sm:text-3xl">{concert.artist_name}</h1>
                {concert.supporting_artists.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    with {concert.supporting_artists.join(', ')}
                  </p>
                )}

                {/* Details */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Calendar className="size-4" />
                    {format(eventDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                  {concert.event_start && (
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Clock className="size-4" />
                      {format(parseISO(concert.event_start), 'h:mm a')}
                    </div>
                  )}
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <MapPin className="size-4" />
                    {concert.venue_name}
                    {concert.venue_address && (
                      <span className="hidden text-xs sm:inline">
                        · {concert.venue_address}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateField('rating', concert.rating === i + 1 ? null : i + 1)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'size-6 sm:size-7',
                        concert.rating && i < concert.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30 hover:text-amber-300'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Venue Map */}
      {concert.venue_lat && concert.venue_lng && (
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
        >
          <ConcertVenueMap
            singleVenue={{
              lat: concert.venue_lat,
              lng: concert.venue_lng,
              name: concert.venue_name,
              address: concert.venue_address || undefined,
            }}
            height="200px"
            className="overflow-hidden rounded-xl"
          />
        </motion.div>
      )}

      {/* Setlist */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <ConcertSetlist
          concertId={concertId}
          setlistData={concert.setlist_data}
          onSetlistFetched={(data: SetlistData) => {
            setConcert((prev) =>
              prev ? { ...prev, setlist_data: data, tour_name: prev.tour_name || data.tour?.name || null } : prev
            )
          }}
        />
      </motion.div>

      {/* Photo Gallery */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
      >
        <ConcertPhotoGallery
          concertId={concertId}
          photos={concert.photos || []}
          onPhotosUploaded={(photos: ConcertPhoto[]) =>
            setConcert((prev) => (prev ? { ...prev, photos } : prev))
          }
          onPhotoDeleted={(photoId: string) =>
            setConcert((prev) =>
              prev
                ? {
                    ...prev,
                    photos: prev.photos?.filter((p) => p.id !== photoId),
                  }
                : prev
            )
          }
          onCoverSet={async (photoId: string) => {
            const photo = concert.photos?.find((p) => p.id === photoId)
            if (photo) {
              setConcert((prev) =>
                prev
                  ? {
                      ...prev,
                      cover_image: photo.storage_url,
                      photos: prev.photos?.map((p) => ({
                        ...p,
                        is_cover: p.id === photoId,
                      })),
                    }
                  : prev
              )
              try {
                await fetch(
                  `/api/concerts/${concertId}/photos?action=setCover&photoId=${photoId}`,
                  { method: 'PUT' }
                )
              } catch {}
            }
          }}
        />
      </motion.div>

      {/* Spotify Section */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <ConcertSpotifySection
          concertId={concertId}
          artistName={concert.artist_name}
        />
      </motion.div>

      {/* Notes & Details */}
      <motion.div
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.25 }}
      >
        <ConcertDetailsPanel
          concert={concert}
          onUpdate={updateField}
        />
      </motion.div>
    </div>
  )
}

/** Notes, companions, tags, ticket cost */
function ConcertDetailsPanel({
  concert,
  onUpdate,
}: {
  concert: Concert
  onUpdate: (field: string, value: unknown) => Promise<void>
}) {
  const [notes, setNotes] = useState(concert.notes || '')
  const [companionInput, setCompanionInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleNotesChange = (value: string) => {
    setNotes(value)
    // Auto-save with debounce
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    notesTimeoutRef.current = setTimeout(() => {
      onUpdate('notes', value)
    }, 1000)
  }

  const addCompanion = () => {
    const name = companionInput.trim()
    if (name && !concert.companions.includes(name)) {
      onUpdate('companions', [...concert.companions, name])
      setCompanionInput('')
    }
  }

  const removeCompanion = (name: string) => {
    onUpdate('companions', concert.companions.filter((c) => c !== name))
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !concert.tags.includes(tag)) {
      onUpdate('tags', [...concert.tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    onUpdate('tags', concert.tags.filter((t) => t !== tag))
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {/* Notes */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Pencil className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">Notes & Memories</span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="What do you remember about this night?"
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Companions */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">Who You Went With</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {concert.companions.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">
                {c}
                <button onClick={() => removeCompanion(c)}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Add person"
                value={companionInput}
                onChange={(e) => setCompanionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCompanion()
                  }
                }}
                className="h-7 w-28 text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={addCompanion}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Tag className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {concert.tags.map((t) => (
              <Badge key={t} variant="outline" className="gap-1 pr-1">
                {t}
                <button onClick={() => removeTag(t)}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                className="h-7 w-24 text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={addTag}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Ticket cost */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <DollarSign className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">Ticket Cost</span>
          </div>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={concert.ticket_cost ?? ''}
            onChange={(e) =>
              onUpdate(
                'ticket_cost',
                e.target.value ? Number(e.target.value) : null
              )
            }
            className="h-8 w-32 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  )
}
