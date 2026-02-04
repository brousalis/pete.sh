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
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SpotifyUser, SpotifyPlaybackState } from "@/lib/types/spotify.types"
import { apiGet, apiPost, getApiBaseUrl } from "@/lib/api/client"
import { useConnectivity } from "@/components/connectivity-provider"
import { useSmoothProgress } from "@/hooks/use-smooth-progress"

interface SpotifyUserResponse {
  user: SpotifyUser | null
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
}

interface SpotifyPlaybackResponse {
  playback: {
    isPlaying: boolean
    track: {
      name: string
      artist: string
      album: string
      imageUrl: string
    } | null
    progressMs: number
    durationMs: number
  }
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
}

// How long to pause polling after a user action (ms)
const ACTION_DEBOUNCE_MS = 2000

export function DeckMusic() {
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null)
  const [cachedPlayback, setCachedPlayback] = useState<SpotifyPlaybackResponse['playback'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSkipping, setIsSkipping] = useState<"next" | "previous" | null>(null)
  const [source, setSource] = useState<'live' | 'cache' | 'none'>('none')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authAvailable, setAuthAvailable] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)

  // Track last action time to debounce polling
  const lastActionTime = useRef<number>(0)

  const { isInitialized: isConnectivityInitialized } = useConnectivity()

  // Compute full auth URL based on API base (for cross-origin local mode)
  // Include returnTo param so localhost knows to redirect back to pete.sh
  const fullAuthUrl = authUrl ? (() => {
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}${authUrl}`
    // If we're on a different origin (e.g., pete.sh hitting localhost), include returnTo
    if (typeof window !== 'undefined' && baseUrl && !window.location.origin.includes('localhost')) {
      return `${url}?returnTo=${encodeURIComponent(window.location.origin)}`
    }
    return url
  })() : null

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const response = await apiGet<SpotifyUserResponse>("/api/spotify/me")
      if (response.success && response.data) {
        setUser(response.data.user)
        setSource(response.data.source)
        setIsAuthenticated(response.data.authenticated)
        setAuthAvailable(response.data.authAvailable)
        setAuthUrl(response.data.authUrl || null)
        setError(null)
        return response.data.authenticated || response.data.user !== null
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
      const response = await apiGet<SpotifyPlaybackResponse>("/api/spotify/player")
      if (response.success && response.data) {
        // Double-check we're not in a debounce period
        if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
          return
        }
        setSource(response.data.source)
        setIsAuthenticated(response.data.authenticated)
        setCachedPlayback(response.data.playback)
      }
    } catch {
      // Silent fail
    }
  }, [])

  // Initial load: wait for connectivity so we hit the correct origin (local vs prod)
  useEffect(() => {
    if (!isConnectivityInitialized) return

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
  }, [isConnectivityInitialized, fetchUser, fetchPlayback])

  // Poll playback state: more often when playing
  const isPlaying = cachedPlayback?.isPlaying ?? false
  useEffect(() => {
    if (!user) return

    const pollMs = isPlaying ? 5000 : 30_000
    const interval = setInterval(() => {
      fetchPlayback()
    }, pollMs)

    return () => clearInterval(interval)
  }, [user, fetchPlayback, isPlaying])

  // Smooth progress from last poll; interpolates between API updates
  const progress = useSmoothProgress(
    isPlaying,
    cachedPlayback?.progressMs ?? 0,
    cachedPlayback?.durationMs ?? 0
  )

  // Play/Pause
  const handlePlayPause = async () => {
    const currentlyPlaying = playbackState?.is_playing ?? cachedPlayback?.isPlaying ?? false
    const endpoint = currentlyPlaying
      ? "/api/spotify/player/pause"
      : "/api/spotify/player/play"
    lastActionTime.current = Date.now()
    setPlaybackState((prev) =>
      prev ? { ...prev, is_playing: !prev.is_playing } : null
    )
    try {
      const response = await apiPost(endpoint, {})
      if (!response.success) {
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
      await apiPost(`/api/spotify/player/${direction}`, {})
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

  // Check if we should show controls
  const showControls = isAuthenticated && source === 'live'
  
  // Get display track info from cached playback
  const displayTrack = cachedPlayback?.track

  // Not connected and no cached data state
  if (!loading && !user && !displayTrack) {
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
              {authAvailable ? "Not connected" : "No playback data"}
            </div>
            {authAvailable && fullAuthUrl && (
              <a
                href={fullAuthUrl}
                className="text-xs text-green-500 hover:underline"
              >
                Connect Spotify
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

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
            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
              Music
              {source === 'cache' && (
                <Database className="size-2.5 text-muted-foreground" />
              )}
            </div>
            {(user || source === 'cache') && (
              <div className="text-xs text-muted-foreground">
                {source === 'cache' ? 'Read-only' : 'Spotify'}
              </div>
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
        {displayTrack ? (
          <>
            {/* Now Playing */}
            <div
              className={`relative flex items-center gap-2 rounded-lg bg-background/50 p-1.5 transition-all ${
                isSkipping && showControls ? "scale-[0.98]" : ""
              }`}
            >
              {/* Skip overlay */}
              {isSkipping && showControls && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px]">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isSkipping === "next" ? "Next..." : "Previous..."}
                  </span>
                </div>
              )}

              {/* Album Art */}
              {displayTrack.imageUrl ? (
                <Image
                  src={displayTrack.imageUrl}
                  alt={displayTrack.album}
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
                  {displayTrack.name}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {displayTrack.artist}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-[width] duration-100 ease-linear ${showControls ? "bg-green-500" : "bg-green-500/50"}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controls - only show when authenticated */}
            {showControls ? (
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
            ) : authAvailable && fullAuthUrl ? (
              /* Connect button for local mode */
              <div className="flex items-center justify-center">
                <a
                  href={fullAuthUrl}
                  className="rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                >
                  Connect Spotify
                </a>
              </div>
            ) : null}
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
                {showControls ? "Start playback on any device" : "No recent playback data"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
