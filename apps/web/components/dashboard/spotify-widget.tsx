'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost, getApiBaseUrl } from '@/lib/api/client'
import type {
    SpotifyListeningHistoryEntry,
    SpotifyPlaybackState,
    SpotifyUser,
} from '@/lib/types/spotify.types'
import {
    Clock,
    Database,
    Music,
    Pause,
    Play,
    SkipBack,
    SkipForward,
} from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

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

/** Poll interval when playback is active (ms) */
const PLAYBACK_POLL_MS = 5000
/** Poll interval when nothing is playing (ms) */
const IDLE_POLL_MS = 30_000

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
  const [playbackState, setPlaybackState] =
    useState<SpotifyPlaybackState | null>(null)
  const [cachedPlayback, setCachedPlayback] = useState<
    SpotifyPlaybackResponse['playback'] | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isSkipping, setIsSkipping] = useState<'next' | 'previous' | null>(null)
  const [source, setSource] = useState<'live' | 'cache' | 'none'>('none')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authAvailable, setAuthAvailable] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [recentHistory, setRecentHistory] = useState<
    SpotifyListeningHistoryEntry[]
  >([])

  // Track last action time to debounce polling
  const lastActionTime = useRef<number>(0)

  // Format relative time for recent songs
  const formatRecentTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Compute full auth URL based on API base (for cross-origin local mode)
  // Include returnTo param so localhost knows to redirect back to pete.sh
  const fullAuthUrl = authUrl
    ? (() => {
        const baseUrl = getApiBaseUrl()
        const url = `${baseUrl}${authUrl}`
        // If we're on a different origin (e.g., pete.sh hitting localhost), include returnTo
        if (
          typeof window !== 'undefined' &&
          baseUrl &&
          !window.location.origin.includes('localhost')
        ) {
          return `${url}?returnTo=${encodeURIComponent(window.location.origin)}`
        }
        return url
      })()
    : null

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const response = await apiGet<SpotifyUserResponse>('/api/spotify/me')
      if (response.success && response.data) {
        setUser(response.data.user)
        setSource(response.data.source)
        setIsAuthenticated(response.data.authenticated)
        setAuthAvailable(response.data.authAvailable)
        setAuthUrl(response.data.authUrl || null)
        return response.data.authenticated || response.data.user !== null
      }
      setUser(null)
      return false
    } catch {
      return false
    }
  }, [])

  // Fetch last 3 recent songs from listening history
  const fetchRecentHistory = useCallback(async () => {
    try {
      const response = await apiGet<{
        history: SpotifyListeningHistoryEntry[]
      }>('/api/spotify/history?limit=3')
      if (response.success && response.data?.history) {
        setRecentHistory(response.data.history)
      }
    } catch {
      // Silent fail
    }
  }, [])

  // Fetch playback state
  const fetchPlayback = useCallback(async (force = false) => {
    // Skip if a recent action was taken (unless forced)
    if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
      return
    }

    try {
      const response = await apiGet<SpotifyPlaybackResponse>(
        '/api/spotify/player'
      )
      if (response.success && response.data) {
        // Double-check we're not in a debounce period
        if (
          !force &&
          Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS
        ) {
          return
        }
        setSource(response.data.source)
        setIsAuthenticated(response.data.authenticated)
        setCachedPlayback(response.data.playback)

        // Update progress
        if (response.data.playback?.durationMs > 0) {
          setProgress(
            (response.data.playback.progressMs /
              response.data.playback.durationMs) *
              100
          )
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
        await Promise.all([fetchPlayback(true), fetchRecentHistory()])
      }
      setLoading(false)
    }
    init()
  }, [fetchUser, fetchPlayback, fetchRecentHistory])

  // Poll playback state: more often when playing, less when idle
  const isPlaying = cachedPlayback?.isPlaying ?? false
  useEffect(() => {
    if (!user) return

    const pollMs = isPlaying ? PLAYBACK_POLL_MS : IDLE_POLL_MS
    const intervalId = setInterval(() => {
      fetchPlayback()
    }, pollMs)

    return () => clearInterval(intervalId)
  }, [user, fetchPlayback, isPlaying])

  // Update progress bar smoothly
  useEffect(() => {
    if (!playbackState?.is_playing || !playbackState.item) return

    const interval = setInterval(() => {
      setProgress(prev => {
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
      ? '/api/spotify/player/pause'
      : '/api/spotify/player/play'
    lastActionTime.current = Date.now()
    setPlaybackState(prev =>
      prev ? { ...prev, is_playing: !prev.is_playing } : null
    )
    try {
      const response = await apiPost(endpoint, {})
      if (!response.success) {
        setPlaybackState(prev =>
          prev ? { ...prev, is_playing: !prev.is_playing } : null
        )
      }
      setTimeout(() => fetchPlayback(true), ACTION_DEBOUNCE_MS)
    } catch {
      setPlaybackState(prev =>
        prev ? { ...prev, is_playing: !prev.is_playing } : null
      )
    }
  }

  // Skip
  const handleSkip = async (direction: 'next' | 'previous') => {
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

  // Loading state — skeleton with consistent rhythm
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-muted size-8 animate-pulse rounded-lg" />
            <div className="space-y-1.5">
              <div className="bg-muted h-4 w-20 animate-pulse rounded-md" />
              <div className="bg-muted/80 h-3 w-14 animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-muted size-[4.25rem] animate-pulse rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="bg-muted h-4 w-4/5 animate-pulse rounded-md" />
            <div className="bg-muted/80 h-3.5 w-2/3 animate-pulse rounded" />
            <div className="bg-muted/60 mt-2 h-2 w-full max-w-32 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  // Check if we should show controls
  const showControls = isAuthenticated && source === 'live'

  // Get display track info from cached playback
  const displayTrack = cachedPlayback?.track

  // Not connected and no cached data state
  if (!user && !displayTrack) {
    return (
      <div className="space-y-4">
        <DashboardCardHeader
          icon={<Music className="size-5 text-green-600 dark:text-green-400" />}
          iconContainerClassName="bg-green-500/10"
          title="Spotify"
          viewHref={fullAuthUrl ?? '/music'}
          viewLabel={authAvailable ? 'Connect' : 'View'}
        />
        <p className="text-muted-foreground -mt-2 text-[11px]">
          {authAvailable ? 'Connect to control playback' : 'Music & history'}
        </p>
        <div className="border-muted-foreground/25 bg-muted/20 flex items-center gap-4 rounded-xl border border-dashed py-4 pr-4 pl-4">
          <div className="bg-muted/60 flex size-14 shrink-0 items-center justify-center rounded-xl">
            <Music className="text-muted-foreground/60 size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-sm font-medium">
              {authAvailable ? 'Not connected' : 'No playback data'}
            </p>
            <p className="text-muted-foreground/70 mt-0.5 text-xs">
              {authAvailable
                ? 'Link your account to see now playing and history'
                : 'Play something on Spotify to see it here'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DashboardCardHeader
        icon={
          <Music
            className={`size-5 transition-colors ${
              isPlaying
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground'
            }`}
          />
        }
        iconContainerClassName={isPlaying ? 'bg-green-500/15' : 'bg-muted'}
        title="Spotify"
        badge={
          source === 'cache' ? (
            <span className="bg-muted text-muted-foreground flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]">
              <Database className="size-2.5" />
              Cached
            </span>
          ) : undefined
        }
        viewHref="/music"
        viewLabel="View"
      />

      {/* Now Playing — elevated card, clear hierarchy */}
      {displayTrack ? (
        <div
          className={`bg-card/80 ring-border/50 relative overflow-hidden rounded-xl border shadow-sm ring-1 transition-all duration-300 ${
            isSkipping && showControls ? 'scale-[0.99]' : ''
          } ${isPlaying ? 'ring-green-500/10' : ''}`}
        >
          {/* Skip animation overlay */}
          {isSkipping && showControls && (
            <div className="bg-background/70 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
              <div className="text-muted-foreground flex items-center gap-2">
                {isSkipping === 'previous' && (
                  <SkipBack className="size-4 animate-pulse" />
                )}
                <span className="text-xs font-medium">
                  {isSkipping === 'next' ? 'Next...' : 'Previous...'}
                </span>
                {isSkipping === 'next' && (
                  <SkipForward className="size-4 animate-pulse" />
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 p-3">
            {/* Album Art — subtle ring when playing */}
            <div
              className={`shrink-0 transition-all duration-300 ${
                isSkipping && showControls ? 'opacity-50 blur-[1px]' : ''
              }`}
            >
              {displayTrack.imageUrl ? (
                <div
                  className={`overflow-hidden rounded-lg ${
                    isPlaying ? 'shadow-md ring-2 ring-green-500/20' : ''
                  }`}
                >
                  <Image
                    src={displayTrack.imageUrl}
                    alt={displayTrack.album}
                    width={64}
                    height={64}
                    className={`block size-16 object-cover transition-transform duration-300 ${
                      isSkipping && showControls
                        ? isSkipping === 'next'
                          ? '-translate-x-0.5'
                          : 'translate-x-0.5'
                        : ''
                    }`}
                  />
                </div>
              ) : (
                <div className="bg-muted flex size-16 items-center justify-center rounded-lg">
                  <Music className="text-muted-foreground size-7" />
                </div>
              )}
            </div>

            {/* Track Info & Controls */}
            <div
              className={`min-w-0 flex-1 transition-all duration-300 ${
                isSkipping && showControls ? 'opacity-50' : ''
              }`}
            >
              <div className="truncate text-sm font-semibold tracking-tight">
                {displayTrack.name}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {displayTrack.artist}
              </div>

              {showControls ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted/80 size-8"
                    onClick={() => handleSkip('previous')}
                  >
                    <SkipBack className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-foreground text-background hover:bg-foreground/90 size-9 rounded-full shadow-sm transition-transform hover:scale-105"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="ml-0.5 size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted/80 size-8"
                    onClick={() => handleSkip('next')}
                  >
                    <SkipForward className="size-4" />
                  </Button>

                  <div className="ml-auto max-w-20 flex-1 px-1">
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-green-500 transition-[width] duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-green-500/50 transition-[width] duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/20 flex items-center gap-4 rounded-xl border py-3 pr-4 pl-4">
          <div className="bg-muted/60 flex size-12 shrink-0 items-center justify-center rounded-lg">
            <Music className="text-muted-foreground/60 size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-sm font-medium">
              No track playing
            </p>
            <p className="text-muted-foreground/70 text-xs">
              {showControls
                ? 'Start playback on any device'
                : 'No recent playback data'}
            </p>
          </div>
        </div>
      )}

      {/* Recent — secondary section with thumbnails and time pills */}
      {recentHistory.length > 0 && (user || displayTrack) && (
        <div className="border-border/80 border-t pt-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span className="text-[11px] font-medium tracking-wider uppercase">
              Recently played
            </span>
          </div>
          <ul className="space-y-1">
            {recentHistory.map(entry => (
              <li
                key={entry.id}
                className="hover:bg-muted/50 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors"
              >
                {entry.album_image_url ? (
                  <Image
                    src={entry.album_image_url}
                    alt=""
                    width={32}
                    height={32}
                    className="ring-border/50 size-8 shrink-0 rounded-md object-cover ring-1"
                  />
                ) : (
                  <div className="bg-muted/80 flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Music className="text-muted-foreground size-3.5" />
                  </div>
                )}
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-foreground/95 block truncate text-xs font-medium">
                    {entry.track_name}
                  </span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {entry.track_artists}
                  </span>
                </div>
                <span className="bg-muted/80 text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {formatRecentTime(entry.played_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
