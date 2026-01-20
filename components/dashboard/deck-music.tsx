"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SpotifyUser, SpotifyPlaybackState } from "@/lib/types/spotify.types"

// How long to pause polling after a user action (ms)
const ACTION_DEBOUNCE_MS = 2000

export function DeckMusic() {
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isSkipping, setIsSkipping] = useState<"next" | "previous" | null>(null)

  // Track last action time to debounce polling
  const lastActionTime = useRef<number>(0)

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/me")
      const data = await response.json()
      if (data.success && data.data) {
        setUser(data.data)
        setError(null)
        return true
      }
      if (response.status === 401) {
        setUser(null)
        return false
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Fetch playback state
  const fetchPlayback = useCallback(async (force = false) => {
    // Skip if a recent action was taken (unless forced)
    if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
      return
    }

    try {
      const response = await fetch("/api/spotify/player")
      const data = await response.json()
      if (data.success) {
        // Double-check we're not in a debounce period
        if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
          return
        }
        setPlaybackState(data.data)
        if (data.data?.progress_ms != null && data.data?.item?.duration_ms) {
          setProgress((data.data.progress_ms / data.data.item.duration_ms) * 100)
        }
      }
    } catch {
      // Silent fail
    }
  }, [])

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)
      const isAuth = await fetchUser()
      if (isAuth) {
        await fetchPlayback(true)
      }
      setLoading(false)
    }
    init()
  }, [fetchUser, fetchPlayback])

  // Poll playback state
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchPlayback()
    }, 5000)

    return () => clearInterval(interval)
  }, [user, fetchPlayback])

  // Update progress bar smoothly
  useEffect(() => {
    if (!playbackState?.is_playing || !playbackState.item) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const duration = playbackState.item?.duration_ms || 1
        const increment = (1000 / duration) * 100
        return Math.min(prev + increment, 100)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [playbackState?.is_playing, playbackState?.item])

  // Play/Pause
  const handlePlayPause = async () => {
    const endpoint = playbackState?.is_playing
      ? "/api/spotify/player/pause"
      : "/api/spotify/player/play"
    lastActionTime.current = Date.now()
    setPlaybackState((prev) =>
      prev ? { ...prev, is_playing: !prev.is_playing } : null
    )
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        setPlaybackState((prev) =>
          prev ? { ...prev, is_playing: !prev.is_playing } : null
        )
      }
      setTimeout(() => fetchPlayback(true), ACTION_DEBOUNCE_MS)
    } catch {
      setPlaybackState((prev) =>
        prev ? { ...prev, is_playing: !prev.is_playing } : null
      )
    }
  }

  // Skip
  const handleSkip = async (direction: "next" | "previous") => {
    lastActionTime.current = Date.now()
    setIsSkipping(direction)
    try {
      await fetch(`/api/spotify/player/${direction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      setTimeout(async () => {
        await fetchPlayback(true)
        setIsSkipping(null)
      }, 800)
    } catch {
      setIsSkipping(null)
    }
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-card p-3 shadow-lg">
        <AlertCircle className="size-5 text-destructive" />
        <div className="mt-1 text-xs font-medium text-destructive">{error}</div>
      </div>
    )
  }

  // Not connected state
  if (!loading && !user) {
    return (
      <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg">
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="rounded-lg bg-muted p-1.5">
            <Music className="size-4 text-muted-foreground" />
          </div>
          <div className="text-sm font-semibold">Music</div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Music className="size-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-muted-foreground">
              Not connected
            </div>
            <a
              href="/api/spotify/auth"
              className="text-xs text-green-500 hover:underline"
            >
              Connect Spotify
            </a>
          </div>
        </div>
      </div>
    )
  }

  const currentTrack = playbackState?.item
  const albumArt = currentTrack?.album?.images?.[0]?.url
  const isPlaying = playbackState?.is_playing

  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-card to-card/80 p-2 shadow-lg">
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={`rounded-lg p-1.5 ${isPlaying ? "bg-green-500/20" : "bg-muted"}`}
          >
            <Music
              className={`size-4 ${isPlaying ? "text-green-500" : "text-muted-foreground"}`}
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Music</div>
            {user && (
              <div className="text-xs text-muted-foreground">Spotify</div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            fetchUser()
            fetchPlayback(true)
          }}
          disabled={loading}
          className="h-7 w-7 min-h-[44px] min-w-[44px] touch-manipulation p-0"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col space-y-1.5">
        {currentTrack ? (
          <>
            {/* Now Playing */}
            <div
              className={`relative flex items-center gap-2 rounded-lg bg-background/50 p-1.5 transition-all ${
                isSkipping ? "scale-[0.98]" : ""
              }`}
            >
              {/* Skip overlay */}
              {isSkipping && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px]">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isSkipping === "next" ? "Next..." : "Previous..."}
                  </span>
                </div>
              )}

              {/* Album Art */}
              {albumArt ? (
                <Image
                  src={albumArt}
                  alt={currentTrack.album.name}
                  width={40}
                  height={40}
                  className="shrink-0 rounded-md"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Music className="size-4 text-muted-foreground" />
                </div>
              )}

              {/* Track Info */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">
                  {currentTrack.name}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {currentTrack.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip("previous")}
                className="h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation"
              >
                <SkipBack className="size-4" />
              </Button>
              <button
                onClick={handlePlayPause}
                className={`flex h-12 w-12 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full transition-all active:scale-95 ${
                  isPlaying
                    ? "bg-green-500 text-white"
                    : "bg-foreground text-background"
                }`}
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="ml-0.5 size-5" />
                )}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip("next")}
                className="h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation"
              >
                <SkipForward className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          /* No track playing */
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Music className="size-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground">
                No track playing
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                Start playback on any device
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
