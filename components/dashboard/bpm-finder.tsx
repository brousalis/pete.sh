"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import {
  Music,
  Search,
  Plus,
  Check,
  Loader2,
  ListMusic,
  ExternalLink,
  Play,
  Heart,
  Settings2,
  Info,
  Zap,
  Library,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import type {
  SpotifyTrack,
  SpotifyPlaylist,
} from "@/lib/types/spotify.types"

interface BpmSong {
  id: string
  title: string
  artist: string
  tempo: number
  uri?: string
  album?: string
}

export function BpmFinder() {
  // BPM settings
  const [targetBpm, setTargetBpm] = useState(170)
  const [bpmTolerance, setBpmTolerance] = useState(5)
  const [showSettings, setShowSettings] = useState(false)

  // GetSongBPM integration
  const [bpmApiConfigured, setBpmApiConfigured] = useState<boolean | null>(null)
  const [bpmSearchResults, setBpmSearchResults] = useState<BpmSong[]>([])
  const [tempoResults, setTempoResults] = useState<BpmSong[]>([])
  const [isLoadingTempo, setIsLoadingTempo] = useState(false)

  // Spotify search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [trackBpmCache, setTrackBpmCache] = useState<Map<string, number | null>>(new Map())
  const [loadingBpm, setLoadingBpm] = useState<string | null>(null)

  // Playlist management
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false)
  const [addedTracks, setAddedTracks] = useState<Set<string>>(new Set())
  const [addingTrack, setAddingTrack] = useState<string | null>(null)

  // UI state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  // Check authentication and BPM API status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/spotify/me")
        const data = await response.json()
        setAuthenticated(data.success && data.data)
      } catch {
        setAuthenticated(false)
      }
    }

    const checkBpmApi = async () => {
      try {
        // Test if the BPM API is configured by making a simple request
        const response = await fetch("/api/bpm/tempo?min=170&max=170&limit=1")
        const data = await response.json()
        setBpmApiConfigured(data.success)
      } catch {
        setBpmApiConfigured(false)
      }
    }

    checkAuth()
    checkBpmApi()
  }, [])

  // Fetch playlists on mount
  useEffect(() => {
    if (authenticated) {
      fetchPlaylists()
    }
  }, [authenticated])

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/spotify/playlists?limit=50")
      const data = await response.json()
      if (data.success && data.data?.items) {
        setPlaylists(data.data.items)
      }
    } catch {
      // Silent fail
    }
  }

  // Load songs at target BPM from GetSongBPM
  const loadTempoSongs = useCallback(async () => {
    if (!bpmApiConfigured) return

    setIsLoadingTempo(true)
    try {
      const minBpm = targetBpm - bpmTolerance
      const maxBpm = targetBpm + bpmTolerance
      const response = await fetch(`/api/bpm/tempo?min=${minBpm}&max=${maxBpm}&limit=30`)
      const data = await response.json()

      if (data.success && data.data) {
        const songs: BpmSong[] = data.data.map((item: {
          song_id: string
          song_title: string
          tempo: number
          song_uri?: string
          artist?: { name: string }
          album?: { title: string }
        }) => ({
          id: item.song_id,
          title: item.song_title,
          tempo: item.tempo,
          uri: item.song_uri,
          artist: item.artist?.name || "Unknown",
          album: item.album?.title,
        }))
        setTempoResults(songs)
      }
    } catch (error) {
      console.error("Error loading tempo songs:", error)
    } finally {
      setIsLoadingTempo(false)
    }
  }, [bpmApiConfigured, targetBpm, bpmTolerance])

  // Search Spotify for tracks
  const searchTracks = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}&types=track&limit=10`
      )
      const data = await response.json()
      if (data.success && data.data?.tracks?.items) {
        setSearchResults(data.data.tracks.items)
        
        // Auto-lookup BPM for results if API is configured
        if (bpmApiConfigured) {
          for (const track of data.data.tracks.items.slice(0, 5)) {
            lookupTrackBpm(track)
          }
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, bpmApiConfigured])

  // Lookup BPM for a Spotify track using GetSongBPM
  const lookupTrackBpm = async (track: SpotifyTrack) => {
    if (trackBpmCache.has(track.id)) return

    setLoadingBpm(track.id)
    try {
      const artist = track.artists[0]?.name || ""
      const response = await fetch(
        `/api/bpm/lookup?title=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(artist)}`
      )
      const data = await response.json()

      if (data.success && data.data?.tempo) {
        setTrackBpmCache(prev => new Map(prev).set(track.id, data.data.tempo))
      } else {
        setTrackBpmCache(prev => new Map(prev).set(track.id, null))
      }
    } catch {
      setTrackBpmCache(prev => new Map(prev).set(track.id, null))
    } finally {
      setLoadingBpm(null)
    }
  }

  // Create a new playlist
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return

    setIsCreatingPlaylist(true)
    try {
      const response = await fetch("/api/spotify/playlists/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlaylistName,
          description: `Running playlist - ${targetBpm} BPM`,
          public: false,
        }),
      })
      const data = await response.json()

      if (data.success && data.data) {
        setPlaylists([data.data, ...playlists])
        setSelectedPlaylist(data.data)
        setNewPlaylistName("")
        setShowPlaylistDialog(false)
      }
    } catch (error) {
      console.error("Error creating playlist:", error)
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  // Add track to selected playlist
  const addToPlaylist = async (track: SpotifyTrack) => {
    if (!selectedPlaylist) {
      setShowPlaylistDialog(true)
      return
    }

    setAddingTrack(track.id)
    try {
      const response = await fetch(`/api/spotify/playlists/${selectedPlaylist.id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [track.uri] }),
      })

      if (response.ok) {
        setAddedTracks(new Set([...addedTracks, track.id]))
      }
    } catch (error) {
      console.error("Error adding track:", error)
    } finally {
      setAddingTrack(null)
    }
  }

  // Search Spotify for a song from GetSongBPM results and add to playlist
  const searchAndAddSong = async (song: BpmSong) => {
    const query = `${song.title} ${song.artist}`
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}&types=track&limit=1`
      )
      const data = await response.json()
      if (data.success && data.data?.tracks?.items?.[0]) {
        const track = data.data.tracks.items[0]
        await addToPlaylist(track)
      }
    } catch {
      // Silent fail
    }
  }

  // Play a track
  const playTrack = async (uri: string) => {
    try {
      await fetch("/api/spotify/player/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [uri] }),
      })
    } catch {
      // Silent fail
    }
  }

  // Play a song from BPM results by searching Spotify first
  const playSongFromBpm = async (song: BpmSong) => {
    const query = `${song.title} ${song.artist}`
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}&types=track&limit=1`
      )
      const data = await response.json()
      if (data.success && data.data?.tracks?.items?.[0]) {
        const track = data.data.tracks.items[0]
        await playTrack(track.uri)
      }
    } catch {
      // Silent fail
    }
  }

  // Format BPM with color indicator
  const formatBpm = (bpm: number) => {
    const diff = Math.abs(bpm - targetBpm)
    let color = "text-green-500"
    if (diff > 3) color = "text-yellow-500"
    if (diff > bpmTolerance) color = "text-orange-500"
    return (
      <span className={`font-mono text-xs ${color}`}>
        {Math.round(bpm)} BPM
      </span>
    )
  }

  // Track row component for Spotify results
  const SpotifyTrackRow = ({ track }: { track: SpotifyTrack }) => {
    const isAdded = addedTracks.has(track.id)
    const isAdding = addingTrack === track.id
    const cachedBpm = trackBpmCache.get(track.id)
    const isLoadingThisBpm = loadingBpm === track.id

    return (
      <div className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
        {/* Album art */}
        <button
          onClick={() => playTrack(track.uri)}
          className="relative shrink-0"
        >
          {track.album.images?.[2] ? (
            <Image
              src={track.album.images[2].url}
              alt={track.album.name}
              width={40}
              height={40}
              className="rounded"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded bg-muted">
              <Music className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-4 text-white" fill="white" />
          </div>
        </button>

        {/* Track info */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{track.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {track.artists.map(a => a.name).join(", ")}
          </div>
        </div>

        {/* BPM */}
        <div className="shrink-0 w-16 text-right">
          {isLoadingThisBpm ? (
            <Loader2 className="ml-auto size-3 animate-spin text-muted-foreground" />
          ) : cachedBpm ? (
            formatBpm(cachedBpm)
          ) : bpmApiConfigured ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => lookupTrackBpm(track)}
            >
              <Zap className="mr-1 size-3" />
              BPM
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* Add to playlist button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => addToPlaylist(track)}
          disabled={isAdded || isAdding}
        >
          {isAdding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isAdded ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </div>
    )
  }

  // BPM song row component
  const BpmSongRow = ({ song }: { song: BpmSong }) => {
    const [isAdding, setIsAdding] = useState(false)
    const [isAdded, setIsAdded] = useState(false)

    const handleAdd = async () => {
      if (!selectedPlaylist) {
        setShowPlaylistDialog(true)
        return
      }
      setIsAdding(true)
      await searchAndAddSong(song)
      setIsAdded(true)
      setIsAdding(false)
    }

    return (
      <div className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
        {/* Play button */}
        <button
          onClick={() => playSongFromBpm(song)}
          className="relative flex size-10 shrink-0 items-center justify-center rounded bg-muted"
        >
          <Music className="size-4 text-muted-foreground" />
          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-4 text-white" fill="white" />
          </div>
        </button>

        {/* Track info */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{song.title}</div>
          <div className="truncate text-xs text-muted-foreground">{song.artist}</div>
        </div>

        {/* BPM */}
        <div className="shrink-0">
          {formatBpm(song.tempo)}
        </div>

        {/* Add to playlist button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={handleAdd}
          disabled={isAdded || isAdding}
        >
          {isAdding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isAdded ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </div>
    )
  }

  // Not authenticated
  if (authenticated === false) {
    return (
      <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-purple-500/20 p-2">
            <Heart className="size-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Running BPM Finder</h3>
            <p className="text-xs text-muted-foreground">Connect Spotify to find running music</p>
          </div>
        </div>
        <a
          href="/api/spotify/auth"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600"
        >
          <Music className="size-5" />
          Connect Spotify
        </a>
      </div>
    )
  }

  // Loading
  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-card p-8 shadow-sm">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-purple-500/20 p-2">
            <Heart className="size-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Running BPM Finder</h3>
            <p className="text-xs text-muted-foreground">
              Find {targetBpm} BPM tracks for your runs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Playlist selector */}
          <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ListMusic className="size-4" />
                <span className="max-w-24 truncate">
                  {selectedPlaylist?.name || "Select Playlist"}
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Create new playlist */}
                <div className="flex gap-2">
                  <Input
                    placeholder="New playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
                  />
                  <Button onClick={createPlaylist} disabled={isCreatingPlaylist || !newPlaylistName.trim()}>
                    {isCreatingPlaylist ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </Button>
                </div>

                {/* Existing playlists */}
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => {
                        setSelectedPlaylist(playlist)
                        setShowPlaylistDialog(false)
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted ${
                        selectedPlaylist?.id === playlist.id ? "bg-muted" : ""
                      }`}
                    >
                      {playlist.images?.[0] ? (
                        <Image
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          width={32}
                          height={32}
                          className="rounded"
                        />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded bg-muted">
                          <ListMusic className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{playlist.name}</div>
                        <div className="text-xs text-muted-foreground">{playlist.tracks.total} tracks</div>
                      </div>
                      {selectedPlaylist?.id === playlist.id && (
                        <Check className="size-4 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Settings button */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Settings2 className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>BPM Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Target BPM</Label>
                    <span className="font-mono text-sm">{targetBpm}</span>
                  </div>
                  <Slider
                    value={[targetBpm]}
                    onValueChange={(v) => setTargetBpm(v[0] ?? targetBpm)}
                    min={100}
                    max={200}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Common running cadences: 150 (easy), 170 (moderate), 180 (fast)
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>BPM Tolerance (±)</Label>
                    <span className="font-mono text-sm">±{bpmTolerance}</span>
                  </div>
                  <Slider
                    value={[bpmTolerance]}
                    onValueChange={(v) => setBpmTolerance(v[0] ?? bpmTolerance)}
                    min={1}
                    max={15}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Searches for tracks between {targetBpm - bpmTolerance} and {targetBpm + bpmTolerance} BPM
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowSettings(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* API Status */}
      {bpmApiConfigured === false && (
        <div className="rounded-lg bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div className="text-xs">
              <p className="font-medium text-foreground">BPM API not configured</p>
              <p className="text-muted-foreground">
                Add <code className="rounded bg-muted px-1">GETSONGBPM_API_KEY</code> to your .env file.{" "}
                <a
                  href="https://getsongbpm.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 underline"
                >
                  Get a free API key
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1 gap-2">
            <Search className="size-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex-1 gap-2" disabled={!bpmApiConfigured}>
            <Sparkles className="size-4" />
            {targetBpm} BPM
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search Spotify for tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchTracks()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={searchTracks}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {searchResults.map((track) => (
                <SpotifyTrackRow key={track.id} track={track} />
              ))}
            </div>
          )}

          {searchResults.length === 0 && !isSearching && (
            <div className="py-6 text-center">
              <Music className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Search for tracks to find their BPM
              </p>
              {bpmApiConfigured && (
                <p className="mt-1 text-xs text-muted-foreground">
                  BPM will be looked up automatically
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-3">
          <Button
            onClick={loadTempoSongs}
            disabled={isLoadingTempo}
            className="w-full gap-2"
            variant={tempoResults.length > 0 ? "outline" : "default"}
          >
            {isLoadingTempo ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {tempoResults.length > 0 ? "Refresh" : `Find ${targetBpm - bpmTolerance}-${targetBpm + bpmTolerance} BPM Songs`}
              </>
            )}
          </Button>

          {/* Tempo results */}
          {tempoResults.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">
                  Found {tempoResults.length} songs
                </span>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {tempoResults.map((song) => (
                  <BpmSongRow key={song.id} song={song} />
                ))}
              </div>
            </div>
          )}

          {tempoResults.length === 0 && !isLoadingTempo && (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Find popular songs at your target BPM
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* GetSongBPM attribution (required - dofollow link) */}
      <div className="flex items-center justify-center gap-1.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span>BPM data powered by</span>
        <a
          href="https://getsongbpm.com"
          target="_blank"
          rel="noopener"
          className="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
        >
          GetSongBPM.com
        </a>
      </div>
    </div>
  )
}
