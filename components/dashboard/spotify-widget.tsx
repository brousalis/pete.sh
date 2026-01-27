"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SpotifyUser, SpotifyPlaybackState } from "@/lib/types/spotify.types"
import { apiGet, apiPost } from "@/lib/api/client"

// How long to pause polling after a user action (ms)
const ACTION_DEBOUNCE_MS = 2000

/**
 * SpotifyWidget - A compact dashboard widget showing current playback.
 * 
 * Shows:
 * - Album art and current track info
 * - Play/pause and skip controls
 * - Progress bar
 * - Quick link to full music page
 */
export function SpotifyWidget() {
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isSkipping, setIsSkipping] = useState<"next" | "previous" | null>(null)
  
  // Track last action time to debounce polling
  const lastActionTime = useRef<number>(0)

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const response = await apiGet<SpotifyUser>("/api/spotify/me")
      if (response.success && response.data) {
        setUser(response.data)
        return true
      }
      setUser(null)
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
      const response = await apiGet<SpotifyPlaybackState>("/api/spotify/player")
      if (response.success) {
        // Double-check we're not in a debounce period
        if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
          return
        }
        setPlaybackState(response.data ?? null)
        if (response.data?.progress_ms != null && response.data?.item?.duration_ms) {
          setProgress((response.data.progress_ms / response.data.item.duration_ms) * 100)
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
    }, 5000) // Slower polling for widget

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
    const endpoint = playbackState?.is_playing ? "/api/spotify/player/pause" : "/api/spotify/player/play"
    lastActionTime.current = Date.now()
    setPlaybackState((prev) => prev ? { ...prev, is_playing: !prev.is_playing } : null)
    try {
      const response = await apiPost(endpoint, {})
      if (!response.success) {
        setPlaybackState((prev) => prev ? { ...prev, is_playing: !prev.is_playing } : null)
      }
      setTimeout(() => fetchPlayback(true), ACTION_DEBOUNCE_MS)
    } catch {
      setPlaybackState((prev) => prev ? { ...prev, is_playing: !prev.is_playing } : null)
    }
  }

  // Skip
  const handleSkip = async (direction: "next" | "previous") => {
    lastActionTime.current = Date.now()
    setIsSkipping(direction)
    try {
      await apiPost(`/api/spotify/player/${direction}`, {})
      setTimeout(async () => {
        await fetchPlayback(true)
        setIsSkipping(null)
      }, 800)
    } catch {
      setIsSkipping(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-3 flex items-center gap-2">
          <div className="size-5 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="size-14 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  // Not connected state
  if (!user) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="size-5 text-green-500" />
            <h2 className="font-semibold">Spotify</h2>
          </div>
          <Link href="/music">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              Connect
              <ChevronRight className="size-3" />
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <Music className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground">Not connected</div>
            <div className="text-xs text-muted-foreground/70">Connect to control playback</div>
          </div>
        </div>
      </div>
    )
  }

  const currentTrack = playbackState?.item
  const albumArt = currentTrack?.album?.images?.[0]?.url
  const isPlaying = playbackState?.is_playing

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1 ${isPlaying ? "bg-green-500/20" : "bg-muted"}`}>
            <Music className={`size-4 ${isPlaying ? "text-green-500" : "text-muted-foreground"}`} />
          </div>
          <h2 className="font-semibold">Spotify</h2>
        </div>
        <Link href="/music">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
            View
            <ChevronRight className="size-3" />
          </Button>
        </Link>
      </div>

      {/* Now Playing */}
      {currentTrack ? (
        <div 
          className={`relative overflow-hidden rounded-lg border bg-background/50 p-2.5 transition-all duration-300 ${
            isSkipping ? "scale-[0.98]" : ""
          }`}
        >
          {/* Skip animation overlay */}
          {isSkipping && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {isSkipping === "previous" && <SkipBack className="size-3 animate-pulse" />}
                <span className="text-[10px] font-medium">
                  {isSkipping === "next" ? "Next..." : "Previous..."}
                </span>
                {isSkipping === "next" && <SkipForward className="size-3 animate-pulse" />}
              </div>
            </div>
          )}

          <div className="flex gap-2.5">
            {/* Album Art */}
            <div className={`transition-all duration-300 ${isSkipping ? "opacity-50 blur-[1px]" : ""}`}>
              {albumArt ? (
                <Image
                  src={albumArt}
                  alt={currentTrack.album.name}
                  width={56}
                  height={56}
                  className={`shrink-0 rounded-md shadow-sm transition-transform duration-300 ${
                    isSkipping === "next" ? "-translate-x-1" : isSkipping === "previous" ? "translate-x-1" : ""
                  }`}
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Music className="size-5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Track Info & Controls */}
            <div 
              className={`min-w-0 flex-1 transition-all duration-300 ${
                isSkipping ? "opacity-50" : ""
              }`}
            >
              <div className="truncate text-sm font-medium">{currentTrack.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {currentTrack.artists.map((a) => a.name).join(", ")}
              </div>

              {/* Controls */}
              <div className="mt-1.5 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => handleSkip("previous")}
                >
                  <SkipBack className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => handleSkip("next")}
                >
                  <SkipForward className="size-3.5" />
                </Button>

                {/* Mini progress bar */}
                <div className="ml-auto flex-1 max-w-16">
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-green-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-background/50 p-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
            <Music className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground">No track playing</div>
            <div className="text-xs text-muted-foreground/70">Start playback on any device</div>
          </div>
        </div>
      )}
    </div>
  )
}
