'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { Pause, Play, SkipForward } from 'lucide-react'

export function NowPlayingBar() {
  const { spotifyTrack } = useDashboardV2()

  if (!spotifyTrack?.track) return null

  const { name, artist, imageUrl, durationMs, progressMs } = spotifyTrack.track
  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <div className="rounded-xl px-3 py-2.5 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center gap-2.5">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="size-8 rounded-md ring-1 ring-border shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{artist}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {spotifyTrack.isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="h-[2px] rounded-full bg-muted mt-2 overflow-hidden">
        <div className="h-full rounded-full bg-accent-sage/50 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
