"use client"

import { Music, Pause, Play } from "lucide-react"
import type { SonosState } from "@/lib/types/sonos.types"

interface SonosNowPlayingProps {
  state: SonosState
  onPlay?: () => void
  onPause?: () => void
}

export function SonosNowPlaying({ state, onPlay, onPause }: SonosNowPlayingProps) {
  const { currentTrack, playbackState } = state
  const isPlaying = playbackState === "PLAYING"

  return (
    <div className="rounded-xl bg-background p-4 ring-1 ring-border">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-lg bg-brand/10">
          {currentTrack.albumArtUri ? (
            <img
              src={currentTrack.albumArtUri}
              alt={currentTrack.album}
              className="size-12 rounded-lg object-cover"
            />
          ) : (
            <Music className="size-6 text-brand" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-foreground">{currentTrack.title}</p>
          <p className="truncate text-sm text-muted-foreground">{currentTrack.artist}</p>
          {currentTrack.album && (
            <p className="truncate text-xs text-muted-foreground">{currentTrack.album}</p>
          )}
        </div>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="flex size-10 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
        </button>
      </div>
      {state.elapsedTimeFormatted && (
        <div className="mt-2 text-xs text-muted-foreground">
          {state.elapsedTimeFormatted}
        </div>
      )}
    </div>
  )
}
