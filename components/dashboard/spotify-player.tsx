"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
  Smartphone,
  Speaker,
  Laptop,
  LogOut,
  RefreshCw,
  ExternalLink,
  Search,
  ListMusic,
  ChevronDown,
  AlertCircle,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type {
  SpotifyUser,
  SpotifyPlaybackState,
  SpotifyDevice,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyRepeatMode,
} from "@/lib/types/spotify.types"
import { apiGet, apiPost } from "@/lib/api/client"

interface SpotifyPlayerProps {
  onAuthRequired?: () => void
}

interface SpotifyUserResponse {
  user: SpotifyUser | null
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
  message?: string
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
    recordedAt?: string
  }
  source: 'live' | 'cache' | 'none'
  authenticated: boolean
  authAvailable: boolean
  authUrl?: string
  message?: string
}

// How long to pause polling after a user action (ms)
const ACTION_DEBOUNCE_MS = 2000

export function SpotifyPlayer({ onAuthRequired }: SpotifyPlayerProps) {
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null)
  const [cachedPlayback, setCachedPlayback] = useState<SpotifyPlaybackResponse['playback'] | null>(null)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(50)
  const [progress, setProgress] = useState(0)
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isSkipping, setIsSkipping] = useState<"next" | "previous" | null>(null)
  const [source, setSource] = useState<'live' | 'cache' | 'none'>('none')
  const [authAvailable, setAuthAvailable] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Track last action time to debounce polling
  const lastActionTime = useRef<number>(0)

  // Fetch user profile
  const fetchUser = useCallback(async () => {
    try {
      const response = await apiGet<SpotifyUserResponse>("/api/spotify/me")
      if (response.success && response.data) {
        setUser(response.data.user)
        setSource(response.data.source)
        setAuthAvailable(response.data.authAvailable)
        setAuthUrl(response.data.authUrl || null)
        setIsAuthenticated(response.data.authenticated)
        setError(null)
        return response.data.authenticated || response.data.user !== null
      }
      setUser(null)
      return false
    } catch {
      return false
    }
  }, [])

  // Fetch playback state (with optional force flag to bypass debounce)
  const fetchPlayback = useCallback(async (force = false) => {
    // Skip if a recent action was taken (unless forced)
    if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
      return
    }
    
    try {
      const response = await apiGet<SpotifyPlaybackResponse>("/api/spotify/player")
      if (response.success && response.data) {
        // Double-check we're not in a debounce period (action could have happened during fetch)
        if (!force && Date.now() - lastActionTime.current < ACTION_DEBOUNCE_MS) {
          return
        }
        
        // Update source and auth info
        setSource(response.data.source)
        setAuthAvailable(response.data.authAvailable)
        setAuthUrl(response.data.authUrl || null)
        setIsAuthenticated(response.data.authenticated)
        
        // Store cached playback for display
        setCachedPlayback(response.data.playback)
        
        // If live data, update full playback state (for controls)
        if (response.data.source === 'live' && response.data.authenticated) {
          // Fetch full playback state for control purposes
          // The simplified playback format doesn't have all the fields
          setPlaybackState(null) // Will be updated by other logic if needed
        } else {
          setPlaybackState(null)
        }
        
        // Update progress from cached playback
        if (response.data.playback?.durationMs > 0) {
          setProgress((response.data.playback.progressMs / response.data.playback.durationMs) * 100)
        }
      }
    } catch {
      // Silent fail for playback polling
    }
  }, [])

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    try {
      const response = await apiGet<SpotifyDevice[]>("/api/spotify/devices")
      if (response.success && response.data) {
        setDevices(response.data)
      }
    } catch {
      // Silent fail
    }
  }, [])

  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    try {
      const response = await apiGet<{ items: SpotifyPlaylist[] }>("/api/spotify/playlists?limit=10")
      if (response.success && response.data?.items) {
        setPlaylists(response.data.items)
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
        await Promise.all([fetchPlayback(true), fetchDevices(), fetchPlaylists()])
      }
      setLoading(false)
    }
    init()
  }, [fetchUser, fetchPlayback, fetchDevices, fetchPlaylists])

  // Poll playback state
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchPlayback()
    }, 3000)

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
    // Mark action time to debounce polling
    lastActionTime.current = Date.now()
    // Optimistically update UI
    setPlaybackState((prev) => prev ? { ...prev, is_playing: !prev.is_playing } : null)
    try {
      const response = await apiPost(endpoint, {})
      if (!response.success) {
        // Revert on failure
        setPlaybackState((prev) => prev ? { ...prev, is_playing: !prev.is_playing } : null)
      }
      // Refresh actual state after debounce period
      setTimeout(() => fetchPlayback(true), ACTION_DEBOUNCE_MS)
    } catch {
      // Revert on error
      setPlaybackState((prev) => prev ? { ...prev, is_playing: !prev.is_playing } : null)
    }
  }

  // Skip
  const handleSkip = async (direction: "next" | "previous") => {
    // Mark action time to debounce polling
    lastActionTime.current = Date.now()
    // Start skip animation
    setIsSkipping(direction)
    try {
      await apiPost(`/api/spotify/player/${direction}`, {})
      // Refresh playback state after a short delay, then clear animation
      setTimeout(async () => {
        await fetchPlayback(true)
        setIsSkipping(null)
      }, 800)
    } catch {
      // Clear animation on error
      setIsSkipping(null)
    }
  }

  // Volume change
  const handleVolumeChange = async (newVolume: number[]) => {
    const vol = newVolume[0] ?? 50
    setVolume(vol)
    try {
      await apiPost("/api/spotify/player/volume", { volume: vol })
    } catch {
      // Silent fail, volume is already updated optimistically
    }
  }

  // Toggle shuffle
  const handleShuffle = async () => {
    const newState = !playbackState?.shuffle_state
    // Mark action time to debounce polling
    lastActionTime.current = Date.now()
    // Optimistic update
    setPlaybackState((prev) => prev ? { ...prev, shuffle_state: newState } : null)
    try {
      const response = await apiPost("/api/spotify/player/shuffle", { state: newState })
      if (!response.success) {
        // Revert on failure
        setPlaybackState((prev) => prev ? { ...prev, shuffle_state: !newState } : null)
      }
    } catch {
      // Revert on error
      setPlaybackState((prev) => prev ? { ...prev, shuffle_state: !newState } : null)
    }
  }

  // Cycle repeat mode
  const handleRepeat = async () => {
    const modes: SpotifyRepeatMode[] = ["off", "context", "track"]
    const currentIndex = modes.indexOf(playbackState?.repeat_state || "off")
    const newMode = modes[(currentIndex + 1) % 3] ?? "off"
    // Mark action time to debounce polling
    lastActionTime.current = Date.now()
    // Optimistic update
    setPlaybackState((prev) => prev ? { ...prev, repeat_state: newMode } : null)
    // Note: Repeat API endpoint not implemented, just update UI for now
  }

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const response = await apiGet<{ tracks: { items: SpotifyTrack[] } }>(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&types=track&limit=5`)
      if (response.success && response.data?.tracks?.items) {
        setSearchResults(response.data.tracks.items)
      }
      // Silent fail - no error toast
    } catch {
      // Silent fail
    } finally {
      setIsSearching(false)
    }
  }

  // Play a track
  const playTrack = async (uri: string) => {
    // Mark action time to debounce polling
    lastActionTime.current = Date.now()
    try {
      const response = await apiPost("/api/spotify/player/play", { uris: [uri] })
      if (response.success) {
        setTimeout(() => fetchPlayback(true), ACTION_DEBOUNCE_MS)
        setShowSearch(false)
        setSearchQuery("")
        setSearchResults([])
      }
    } catch {
      // Silent fail
    }
  }

  // Play a playlist
  const playPlaylist = async (uri: string) => {
    // Mark action time to debounce polling
    lastActionTime.current = Date.now()
    try {
      const response = await apiPost("/api/spotify/player/play", { contextUri: uri })
      if (response.success) {
        setTimeout(() => fetchPlayback(true), ACTION_DEBOUNCE_MS)
        setShowPlaylists(false)
      }
    } catch {
      // Silent fail
    }
  }

  // Disconnect
  const handleDisconnect = async () => {
    try {
      await apiPost("/api/spotify/disconnect")
      setUser(null)
      setPlaybackState(null)
    } catch {
      // Still clear local state even if API fails
      setUser(null)
      setPlaybackState(null)
    }
  }

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get device icon
  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "smartphone":
        return <Smartphone className="size-4" />
      case "speaker":
        return <Speaker className="size-4" />
      default:
        return <Laptop className="size-4" />
    }
  }

  // Check if we should show controls (only when authenticated and live)
  const showControls = isAuthenticated && source === 'live'
  
  // Get display track info from either cached playback or full state
  const displayTrack = cachedPlayback?.track || (playbackState?.item ? {
    name: playbackState.item.name,
    artist: playbackState.item.artists.map(a => a.name).join(', '),
    album: playbackState.item.album.name,
    imageUrl: playbackState.item.album.images[0]?.url || '',
  } : null)
  
  const isPlaying = cachedPlayback?.isPlaying ?? playbackState?.is_playing ?? false

  // Not connected and no cached data state
  if (!loading && !user && !cachedPlayback?.track) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-500/20 p-2">
              <Music className="size-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Spotify</h3>
              <p className="text-xs text-muted-foreground">
                {authAvailable ? "Connect to control playback" : "No playback data available"}
              </p>
            </div>
          </div>
        </div>
        {authAvailable && authUrl && (
          <a
            href={authUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600"
          >
            <Music className="size-5" />
            Connect Spotify
          </a>
        )}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with user info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${isPlaying ? "bg-green-500/20" : "bg-muted"}`}>
            <Music className={`size-5 ${isPlaying ? "text-green-500" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Spotify</h3>
              {source === 'cache' && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title="Showing cached data">
                  <Database className="size-2.5" />
                  cached
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {user?.display_name || (source === 'cache' ? 'Read-only' : '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Connect button when auth is available but not authenticated */}
          {authAvailable && !isAuthenticated && authUrl && (
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
              <a href={authUrl}>Connect</a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { fetchPlayback(true); fetchDevices(); }}>
            <RefreshCw className="size-4" />
          </Button>
          {showControls && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSearch(!showSearch)}>
                  <Search className="mr-2 size-4" />
                  Search
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPlaylists(!showPlaylists)}>
                  <ListMusic className="mr-2 size-4" />
                  Playlists
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {playbackState?.item && (
                  <DropdownMenuItem asChild>
                    <a href={playbackState.item.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 size-4" />
                      Open in Spotify
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Search section */}
      {showSearch && (
        <div className="space-y-2 rounded-lg bg-background/50 p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9"
            />
            <Button size="sm" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <RefreshCw className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {searchResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(track.uri)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
                >
                  {track.album.images?.[2] && (
                    <Image
                      src={track.album.images[2].url}
                      alt={track.album.name}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{track.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {track.artists.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlists section */}
      {showPlaylists && playlists.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-background/50 p-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => playPlaylist(playlist.uri)}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
            >
              {playlist.images?.[0] && (
                <Image
                  src={playlist.images[0].url}
                  alt={playlist.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{playlist.name}</div>
                <div className="text-xs text-muted-foreground">{playlist.tracks.total} tracks</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Now Playing */}
      {displayTrack ? (
        <div 
          className={`relative flex gap-3 overflow-hidden rounded-xl bg-background/50 p-3 transition-all duration-300 ${
            isSkipping ? "scale-[0.98]" : ""
          }`}
        >
          {/* Skip animation overlay */}
          {isSkipping && showControls && (
            <div 
              className={`absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] ${
                isSkipping === "next" ? "animate-slide-left" : "animate-slide-right"
              }`}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {isSkipping === "previous" && <SkipBack className="size-4 animate-pulse" />}
                <span className="text-xs font-medium">
                  {isSkipping === "next" ? "Next track..." : "Previous track..."}
                </span>
                {isSkipping === "next" && <SkipForward className="size-4 animate-pulse" />}
              </div>
            </div>
          )}
          
          {/* Album art with animation */}
          <div className={`transition-all duration-300 ${isSkipping && showControls ? "opacity-50 blur-[1px]" : ""}`}>
            {displayTrack.imageUrl ? (
              <Image
                src={displayTrack.imageUrl}
                alt={displayTrack.album}
                width={80}
                height={80}
                className={`shrink-0 rounded-lg shadow-md transition-transform duration-300 ${
                  isSkipping && showControls ? (isSkipping === "next" ? "-translate-x-2" : "translate-x-2") : ""
                }`}
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Music className="size-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Track info with animation */}
          <div 
            className={`min-w-0 flex-1 space-y-1 transition-all duration-300 ${
              isSkipping && showControls ? "opacity-50" : ""
            } ${
              isSkipping && showControls ? (isSkipping === "next" ? "-translate-x-2" : "translate-x-2") : ""
            }`}
          >
            <div className="truncate text-sm font-semibold text-foreground">{displayTrack.name}</div>
            <div className="truncate text-xs text-muted-foreground">{displayTrack.artist}</div>
            <div className="truncate text-xs text-muted-foreground/70">{displayTrack.album}</div>
            
            {/* Progress bar */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatTime(cachedPlayback?.progressMs || playbackState?.progress_ms || 0)}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-green-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatTime(cachedPlayback?.durationMs || playbackState?.item?.duration_ms || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-background/50 p-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Music className="size-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">No track playing</div>
            <div className="text-xs text-muted-foreground">
              {showControls ? "Start playback on any device" : "No recent playback data"}
            </div>
          </div>
        </div>
      )}

      {/* Playback controls - only show when authenticated with live data */}
      {showControls && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`size-9 ${playbackState?.shuffle_state ? "text-green-500" : ""}`}
            onClick={handleShuffle}
          >
            <Shuffle className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-10" onClick={() => handleSkip("previous")}>
            <SkipBack className="size-5" />
          </Button>
          <Button
            size="icon"
            className="size-12 rounded-full bg-foreground text-background hover:bg-foreground/90"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="size-6" /> : <Play className="ml-0.5 size-6" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-10" onClick={() => handleSkip("next")}>
            <SkipForward className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`size-9 ${playbackState?.repeat_state !== "off" ? "text-green-500" : ""}`}
            onClick={handleRepeat}
          >
            {playbackState?.repeat_state === "track" ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
          </Button>
        </div>
      )}

      {/* Volume and device - only show when authenticated */}
      {showControls && (
        <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          {volume === 0 ? (
            <VolumeX className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{volume}%</span>
        </div>
        
        {/* Device selector */}
        {devices.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {playbackState?.device ? (
                  <>
                    {getDeviceIcon(playbackState.device.type)}
                    <span className="max-w-20 truncate text-xs">{playbackState.device.name}</span>
                  </>
                ) : (
                  <>
                    <Speaker className="size-4" />
                    <span className="text-xs">Devices</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {devices.map((device) => (
                <DropdownMenuItem
                  key={device.id}
                  className={device.is_active ? "bg-green-500/10 text-green-500" : ""}
                  disabled={!device.id}
                >
                  {getDeviceIcon(device.type)}
                  <span className="ml-2">{device.name}</span>
                  {device.is_active && <span className="ml-auto text-xs">Active</span>}
                </DropdownMenuItem>
              ))}
              {devices.length === 0 && (
                <DropdownMenuItem disabled>
                  <AlertCircle className="mr-2 size-4" />
                  No devices found
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
      )}
    </div>
  )
}
