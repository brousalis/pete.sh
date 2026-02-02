'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { apiGet, apiPost } from '@/lib/api/client'
import type {
  SpotifyHistorySyncResult,
  SpotifyListeningHistoryEntry,
  SpotifyListeningStats,
} from '@/lib/types/spotify.types'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Disc3,
  Filter,
  Headphones,
  History,
  LayoutGrid,
  LayoutList,
  Music,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface SpotifyHistoryProps {
  onPlayTrack?: (uri: string) => void
  compact?: boolean
}

type ViewMode = 'list' | 'compact' | 'grid'
type FilterType = 'all' | 'artist'

export function SpotifyHistory({
  onPlayTrack,
  compact = false,
}: SpotifyHistoryProps) {
  const [history, setHistory] = useState<SpotifyListeningHistoryEntry[]>([])
  const [stats, setStats] = useState<SpotifyListeningStats | null>(null)
  const [syncInfo, setSyncInfo] = useState<{
    lastSyncAt: string
    totalTracksSynced: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const [showStats, setShowStats] = useState(true)

  // New state for enhanced features
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [artistFilter, setArtistFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null)

  // Fetch listening history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiGet<{
        history: SpotifyListeningHistoryEntry[]
        count: number
      }>('/api/spotify/history?limit=100')
      if (response.success && response.data) {
        setHistory(response.data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }, [])

  // Fetch listening stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiGet<{
        stats: SpotifyListeningStats | null
        syncInfo: { lastSyncAt: string; totalTracksSynced: number }
      }>('/api/spotify/history/stats?days=30')
      if (response.success && response.data) {
        setStats(response.data.stats || null)
        setSyncInfo(response.data.syncInfo || null)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }, [])

  // Sync history from Spotify
  const syncHistory = async () => {
    setSyncing(true)
    try {
      const response = await apiPost<SpotifyHistorySyncResult>(
        '/api/spotify/history/sync',
        {}
      )
      if (response.success && response.data?.success) {
        await Promise.all([fetchHistory(), fetchStats()])
      }
    } catch (error) {
      console.error('Failed to sync history:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchHistory(), fetchStats()])
      setLoading(false)
    }
    init()
  }, [fetchHistory, fetchStats])

  // Filter and search logic
  const filteredHistory = useMemo(() => {
    let result = history

    // Apply artist filter
    if (artistFilter) {
      result = result.filter(entry =>
        entry.track_artists.toLowerCase().includes(artistFilter.toLowerCase())
      )
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        entry =>
          entry.track_name.toLowerCase().includes(query) ||
          entry.track_artists.toLowerCase().includes(query) ||
          entry.album_name.toLowerCase().includes(query)
      )
    }

    return result
  }, [history, searchQuery, artistFilter])

  // Get unique artists for filter
  const uniqueArtists = useMemo(() => {
    const artists = new Map<string, number>()
    history.forEach(entry => {
      const artist =
        entry.track_artists.split(',')[0]?.trim() || entry.track_artists
      artists.set(artist, (artists.get(artist) || 0) + 1)
    })
    return Array.from(artists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
  }, [history])

  // Format relative time with more detail
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format track duration
  const formatTrackDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format duration for stats
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Group history by day
  const groupedHistory = useMemo(() => {
    const visible = filteredHistory.slice(0, visibleCount)
    return visible.reduce(
      (acc, entry) => {
        const date = new Date(entry.played_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(entry)
        return acc
      },
      {} as Record<string, SpotifyListeningHistoryEntry[]>
    )
  }, [filteredHistory, visibleCount])

  // Handle artist filter click
  const handleArtistClick = (artist: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (artistFilter === artist) {
      setArtistFilter(null)
    } else {
      setArtistFilter(artist)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setArtistFilter(null)
  }

  const hasActiveFilters = searchQuery || artistFilter

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
          <RefreshCw className="relative size-6 animate-spin text-green-500" />
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          Loading your listening history...
        </p>
      </div>
    )
  }

  // No history available
  if (history.length === 0 && !stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-2.5">
              <History className="size-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">Listening History</h3>
              <p className="text-muted-foreground text-sm">
                Track your music journey
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncHistory}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sync Now
          </Button>
        </div>
        <div className="border-muted-foreground/20 bg-muted/30 flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center">
          <div className="bg-muted rounded-full p-4">
            <Headphones className="text-muted-foreground size-8" />
          </div>
          <h4 className="mt-4 font-medium">No listening history yet</h4>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Click Sync to fetch your recent plays from Spotify and start
            tracking your music journey
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 text-left transition-colors hover:opacity-80"
        >
          <div className="rounded-xl bg-green-500/10 p-2.5">
            <History className="size-5 text-green-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Listening History</h3>
              {syncInfo && (
                <Badge variant="secondary" className="text-[10px]">
                  {syncInfo.totalTracksSynced} tracks
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {hasActiveFilters
                ? `${filteredHistory.length} results`
                : `Last 30 days of music`}
            </p>
          </div>
          {compact &&
            (expanded ? (
              <ChevronUp className="text-muted-foreground size-5" />
            ) : (
              <ChevronDown className="text-muted-foreground size-5" />
            ))}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant={showStats ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="gap-1.5"
          >
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">Stats</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncHistory}
            disabled={syncing}
            className="gap-1.5"
          >
            {syncing ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      </div>

      {/* Stats Panel - Redesigned */}
      {showStats && stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 p-4 transition-all hover:from-green-500/15 hover:to-green-600/10">
            <div className="absolute top-2 right-2 text-green-500/20">
              <Disc3 className="size-8" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.total_tracks}
            </div>
            <div className="text-muted-foreground text-xs font-medium">
              Total Plays
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4 transition-all hover:from-blue-500/15 hover:to-blue-600/10">
            <div className="absolute top-2 right-2 text-blue-500/20">
              <Music className="size-8" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.unique_tracks}
            </div>
            <div className="text-muted-foreground text-xs font-medium">
              Unique Tracks
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4 transition-all hover:from-purple-500/15 hover:to-purple-600/10">
            <div className="absolute top-2 right-2 text-purple-500/20">
              <User className="size-8" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.unique_artists}
            </div>
            <div className="text-muted-foreground text-xs font-medium">
              Artists
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4 transition-all hover:from-orange-500/15 hover:to-orange-600/10">
            <div className="absolute top-2 right-2 text-orange-500/20">
              <Timer className="size-8" />
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatDuration(stats.total_listening_time_ms)}
            </div>
            <div className="text-muted-foreground text-xs font-medium">
              Listen Time
            </div>
          </div>

          {/* Top Track & Artist */}
          {(stats.top_track || stats.top_artist) && (
            <div className="col-span-2 sm:col-span-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stats.top_track && (
                  <div className="bg-muted/50 flex items-center gap-3 rounded-xl p-3">
                    <div className="rounded-lg bg-green-500/10 p-2">
                      <Sparkles className="size-4 text-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                        Top Track
                      </div>
                      <div className="truncate text-sm font-semibold">
                        {stats.top_track}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {stats.top_track_count} plays
                      </div>
                    </div>
                  </div>
                )}
                {stats.top_artist && (
                  <div className="bg-muted/50 flex items-center gap-3 rounded-xl p-3">
                    <div className="rounded-lg bg-purple-500/10 p-2">
                      <User className="size-4 text-purple-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                        Top Artist
                      </div>
                      <div className="truncate text-sm font-semibold">
                        {stats.top_artist}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {stats.top_artist_count} plays
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      {expanded && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search tracks, artists, or albums..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 pr-9 pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter & View Controls */}
          <div className="flex items-center gap-2">
            {/* Artist Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={artistFilter ? 'secondary' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                >
                  <Filter className="size-4" />
                  <span className="hidden sm:inline">
                    {artistFilter || 'Filter'}
                  </span>
                  {artistFilter && (
                    <Badge
                      variant="secondary"
                      className="ml-1 size-5 justify-center rounded-full p-0 text-[10px]"
                    >
                      1
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Artist</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {artistFilter && (
                  <>
                    <DropdownMenuItem onClick={() => setArtistFilter(null)}>
                      <X className="mr-2 size-4" />
                      Clear filter
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {uniqueArtists.map(([artist, count]) => (
                  <DropdownMenuItem
                    key={artist}
                    onClick={() =>
                      setArtistFilter(artist === artistFilter ? null : artist)
                    }
                    className={artist === artistFilter ? 'bg-secondary' : ''}
                  >
                    <User className="mr-2 size-4" />
                    <span className="flex-1 truncate">{artist}</span>
                    <span className="text-muted-foreground text-xs">
                      {count}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className="bg-background flex rounded-lg border p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="List view"
              >
                <LayoutList className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'compact' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Compact view"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && expanded && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Active filters:</span>
          {artistFilter && (
            <Badge variant="secondary" className="gap-1 pr-1">
              <User className="size-3" />
              {artistFilter}
              <button
                onClick={() => setArtistFilter(null)}
                className="hover:bg-muted ml-1 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              <Search className="size-3" />
              &quot;{searchQuery}&quot;
              <button
                onClick={() => setSearchQuery('')}
                className="hover:bg-muted ml-1 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear all
          </button>
        </div>
      )}

      {/* History List */}
      {expanded && (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date}>
              {/* Date Header - More Prominent */}
              <div className="bg-card/95 sticky top-0 z-10 mb-3 flex items-center gap-2 py-2 backdrop-blur-sm">
                <div className="bg-muted rounded-lg p-1.5">
                  <Calendar className="text-muted-foreground size-4" />
                </div>
                <span className="text-foreground font-semibold">{date}</span>
                <Badge variant="outline" className="text-[10px]">
                  {entries.length} {entries.length === 1 ? 'track' : 'tracks'}
                </Badge>
                <div className="bg-border ml-auto h-px flex-1" />
              </div>

              {/* Tracks */}
              <div
                className={
                  viewMode === 'compact'
                    ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                    : 'space-y-1'
                }
              >
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onPlayTrack?.(entry.track_uri)}
                    onMouseEnter={() => setHoveredTrackId(entry.id)}
                    onMouseLeave={() => setHoveredTrackId(null)}
                    className={`group relative flex w-full items-center gap-3 rounded-xl text-left transition-all ${
                      viewMode === 'compact'
                        ? 'bg-muted/30 hover:bg-muted/60 p-2'
                        : 'hover:bg-muted/50 p-2.5'
                    } ${hoveredTrackId === entry.id ? 'ring-1 ring-green-500/30' : ''}`}
                  >
                    {/* Album art - Larger */}
                    <div
                      className={`relative shrink-0 overflow-hidden rounded-lg ${viewMode === 'compact' ? 'size-12' : 'size-14'}`}
                    >
                      {entry.album_image_url ? (
                        <Image
                          src={entry.album_image_url}
                          alt={entry.album_name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes={viewMode === 'compact' ? '48px' : '56px'}
                        />
                      ) : (
                        <div className="bg-muted flex size-full items-center justify-center">
                          <Music className="text-muted-foreground size-5" />
                        </div>
                      )}
                      {/* Play overlay - More prominent */}
                      {onPlayTrack && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <div className="rounded-full bg-green-500 p-2 shadow-lg transition-transform group-hover:scale-110">
                            <Play className="size-4 fill-white text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Track info - Better hierarchy */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground truncate leading-tight font-semibold">
                            {entry.track_name}
                          </div>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={e => {
                              e.stopPropagation()
                              handleArtistClick(
                                entry.track_artists.split(',')[0]?.trim() ||
                                  entry.track_artists,
                                e
                              )
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                handleArtistClick(
                                  entry.track_artists.split(',')[0]?.trim() ||
                                    entry.track_artists,
                                  e
                                )
                              }
                            }}
                            className="text-muted-foreground mt-0.5 cursor-pointer truncate text-sm transition-colors hover:text-green-500 hover:underline"
                          >
                            {entry.track_artists}
                          </span>
                          {viewMode !== 'compact' && (
                            <div className="text-muted-foreground/70 mt-0.5 flex items-center gap-2 text-xs">
                              <span className="truncate">
                                {entry.album_name}
                              </span>
                              <span>·</span>
                              <span>
                                {formatTrackDuration(entry.duration_ms)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Time - Closer to content */}
                        <div className="shrink-0 text-right">
                          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Clock className="size-3" />
                            {formatRelativeTime(entry.played_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <ChevronRight
                      className={`text-muted-foreground size-4 shrink-0 transition-all ${hoveredTrackId === entry.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Load More / No Results */}
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Search className="text-muted-foreground/50 size-8" />
              <p className="mt-2 text-sm font-medium">No tracks found</p>
              <p className="text-muted-foreground text-xs">
                Try adjusting your search or filters
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-3"
              >
                Clear filters
              </Button>
            </div>
          ) : visibleCount < filteredHistory.length ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="gap-2"
              >
                Load more
                <Badge variant="secondary" className="text-[10px]">
                  {filteredHistory.length - visibleCount} remaining
                </Badge>
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Last sync info - Refined */}
      {syncInfo && (
        <div className="text-muted-foreground/60 flex items-center justify-center gap-2 text-xs">
          <RefreshCw className="size-3" />
          <span>Last synced {formatRelativeTime(syncInfo.lastSyncAt)}</span>
        </div>
      )}
    </div>
  )
}
