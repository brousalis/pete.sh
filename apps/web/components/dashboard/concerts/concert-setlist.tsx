'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiPost } from '@/lib/api/client'
import type { SetlistData, SetlistSet, SetlistSong } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { ExternalLink, ListMusic, Loader2, Music, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface ConcertSetlistProps {
  concertId: string
  setlistData: SetlistData | null
  onSetlistFetched: (data: SetlistData) => void
  className?: string
}

export function ConcertSetlist({
  concertId,
  setlistData,
  onSetlistFetched,
  className,
}: ConcertSetlistProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSetlist = async (force: boolean = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/concerts/${concertId}/setlist${force ? '?force=true' : ''}`
      const response = await apiPost<{ setlist: SetlistData | null; source: string; message?: string }>(url)

      if (response.success && response.data) {
        if (response.data.setlist) {
          onSetlistFetched(response.data.setlist)
        } else {
          setError(response.data.message || 'No setlist found')
        }
      }
    } catch (err) {
      setError('Failed to fetch setlist')
      console.error('Setlist fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalSongs = setlistData?.sets.reduce((acc, s) => acc + s.song.length, 0) || 0

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10">
            <ListMusic className="size-4 text-purple-500" />
          </div>
          <CardTitle className="text-base">Setlist</CardTitle>
          {totalSongs > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalSongs} songs
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {setlistData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchSetlist(true)}
              disabled={loading}
              className="h-7 text-xs"
            >
              <RefreshCw className={cn('mr-1 size-3', loading && 'animate-spin')} />
              Refresh
            </Button>
          )}
          {setlistData?.url && (
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <a href={setlistData.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 size-3" />
                setlist.fm
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {setlistData ? (
          <div className="space-y-4">
            {/* Tour name */}
            {setlistData.tour && (
              <Badge variant="outline" className="text-xs">
                {setlistData.tour.name}
              </Badge>
            )}

            {/* Sets */}
            {setlistData.sets.map((set, setIndex) => (
              <SetlistSetDisplay key={setIndex} set={set} setIndex={setIndex} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <Music className="text-muted-foreground/50 mb-3 size-8" />
            {error ? (
              <p className="text-muted-foreground text-sm">{error}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No setlist loaded yet
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchSetlist()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 size-3 animate-spin" />
              ) : (
                <ListMusic className="mr-2 size-3" />
              )}
              Fetch from setlist.fm
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SetlistSetDisplay({ set, setIndex }: { set: SetlistSet; setIndex: number }) {
  const label = set.encore
    ? `Encore${set.encore > 1 ? ` ${set.encore}` : ''}`
    : set.name || (setIndex === 0 ? 'Main Set' : `Set ${setIndex + 1}`)

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
        {label}
      </p>
      <ol className="space-y-1">
        {set.song.map((song, songIndex) => (
          <SongItem key={songIndex} song={song} number={songIndex + 1} />
        ))}
      </ol>
    </div>
  )
}

function SongItem({ song, number }: { song: SetlistSong; number: number }) {
  return (
    <li className="flex items-start gap-2 py-0.5">
      <span className="text-muted-foreground w-5 shrink-0 text-right text-xs tabular-nums">
        {number}.
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn('text-sm', song.tape && 'text-muted-foreground italic')}>
          {song.name}
          {song.tape && ' (tape)'}
        </span>
        {song.cover && (
          <span className="text-muted-foreground ml-1 text-xs">
            (cover of {song.cover.name})
          </span>
        )}
        {song.with && (
          <span className="text-muted-foreground ml-1 text-xs">
            (with {song.with.name})
          </span>
        )}
        {song.info && (
          <span className="text-muted-foreground ml-1 text-xs">
            ({song.info})
          </span>
        )}
      </div>
    </li>
  )
}
