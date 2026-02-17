'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiGet } from '@/lib/api/client'
import type { ConcertSpotifyData } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { Headphones, Music } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface ConcertSpotifySectionProps {
  concertId: string
  artistName: string
  className?: string
}

export function ConcertSpotifySection({
  concertId,
  artistName,
  className,
}: ConcertSpotifySectionProps) {
  const [data, setData] = useState<ConcertSpotifyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiGet<ConcertSpotifyData>(
          `/api/concerts/${concertId}/spotify`
        )
        if (response.success && response.data) {
          setData(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch Spotify data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [concertId])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex animate-pulse items-center gap-3">
            <div className="size-8 rounded-lg bg-green-500/10" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.total_plays === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
              <Headphones className="size-4 text-green-500" />
            </div>
            <CardTitle className="text-base">Your Listening</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            <Music className="text-muted-foreground/50 mb-2 size-6" />
            <p className="text-muted-foreground text-sm">
              No Spotify data found for {artistName}
            </p>
            <p className="text-muted-foreground/70 mt-0.5 text-xs">
              in the 30 days around this concert
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
            <Headphones className="size-4 text-green-500" />
          </div>
          <CardTitle className="text-base">Your Listening</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            label="Before"
            value={data.plays_before}
            sublabel="30 days"
          />
          <StatBlock
            label="Total Plays"
            value={data.total_plays}
            sublabel="±30 days"
            highlight
          />
          <StatBlock
            label="After"
            value={data.plays_after}
            sublabel="30 days"
          />
        </div>

        {/* Sparkline */}
        {data.daily_plays.length > 0 && (
          <div className="h-16">
            <MiniSparkline data={data.daily_plays} />
          </div>
        )}

        {/* Top tracks */}
        {data.top_tracks.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
              Top Tracks
            </p>
            <div className="space-y-2">
              {data.top_tracks.map((track, i) => (
                <div key={track.track_name} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4 text-right text-xs">
                    {i + 1}
                  </span>
                  {track.album_image_url ? (
                    <Image
                      src={track.album_image_url}
                      alt={track.album_name}
                      width={28}
                      height={28}
                      className="shrink-0 rounded"
                    />
                  ) : (
                    <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded">
                      <Music className="size-3" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{track.track_name}</p>
                    <p className="text-muted-foreground truncate text-xs">{track.album_name}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {track.play_count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatBlock({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string
  value: number
  sublabel: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-2 text-center',
        highlight ? 'bg-green-500/10' : 'bg-muted/50'
      )}
    >
      <p className={cn('text-lg font-bold', highlight && 'text-green-500')}>{value}</p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="text-muted-foreground/70 text-[9px]">{sublabel}</p>
    </div>
  )
}

function MiniSparkline({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const width = 100
  const height = 100

  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - (d.count / max) * height,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="size-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#sparkFill)" />
      <path d={pathD} fill="none" stroke="rgb(34, 197, 94)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
