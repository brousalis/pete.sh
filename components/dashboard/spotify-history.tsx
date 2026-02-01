"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Music,
  Clock,
  RefreshCw,
  History,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Play,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiGet, apiPost } from "@/lib/api/client"
import type {
  SpotifyListeningHistoryEntry,
  SpotifyListeningStats,
  SpotifyHistorySyncResult,
} from "@/lib/types/spotify.types"

interface SpotifyHistoryProps {
  onPlayTrack?: (uri: string) => void
  compact?: boolean
}

interface HistoryResponse {
  history: SpotifyListeningHistoryEntry[]
  count: number
}

interface StatsResponse {
  stats: SpotifyListeningStats | null
  syncInfo: {
    lastSyncAt: string
    totalTracksSynced: number
  }
}

export function SpotifyHistory({ onPlayTrack, compact = false }: SpotifyHistoryProps) {
  const [history, setHistory] = useState<SpotifyListeningHistoryEntry[]>([])
  const [stats, setStats] = useState<SpotifyListeningStats | null>(null)
  const [syncInfo, setSyncInfo] = useState<{ lastSyncAt: string; totalTracksSynced: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const [showStats, setShowStats] = useState(false)

  // Fetch listening history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiGet<{ history: SpotifyListeningHistoryEntry[]; count: number }>("/api/spotify/history?limit=50")
      if (response.success && response.data) {
        setHistory(response.data.history || [])
      }
    } catch (error) {
      console.error("Failed to fetch history:", error)
    }
  }, [])

  // Fetch listening stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiGet<StatsResponse>("/api/spotify/history/stats?days=30")
      if (response.success && response.data) {
        setStats(response.data.stats || null)
        setSyncInfo(response.data.syncInfo || null)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }, [])

  // Sync history from Spotify
  const syncHistory = async () => {
    setSyncing(true)
    try {
      const response = await apiPost<SpotifyHistorySyncResult>("/api/spotify/history/sync", {})
      if (response.success && response.data?.success) {
        // Refresh history and stats after sync
        await Promise.all([fetchHistory(), fetchStats()])
      }
    } catch (error) {
      console.error("Failed to sync history:", error)
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

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Format duration
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
  const groupedHistory = history.reduce((acc, entry) => {
    const date = new Date(entry.played_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {} as Record<string, SpotifyListeningHistoryEntry[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No history available
  if (history.length === 0 && !stats) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Listening History</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncHistory}
            disabled={syncing}
            className="h-7 gap-1.5 text-xs"
          >
            {syncing ? (
              <RefreshCw className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Sync
          </Button>
        </div>
        <div className="rounded-lg border border-dashed border-muted-foreground/25 p-4 text-center">
          <Music className="mx-auto mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No listening history yet</p>
          <p className="text-xs text-muted-foreground/70">
            Click Sync to fetch your recent plays from Spotify
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <History className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Listening History</span>
          {syncInfo && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {syncInfo.totalTracksSynced} tracks
            </span>
          )}
          {compact && (
            expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )
          )}
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="h-7 gap-1 px-2 text-xs"
          >
            <TrendingUp className="size-3" />
            Stats
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncHistory}
            disabled={syncing}
            className="h-7 gap-1.5 text-xs"
          >
            {syncing ? (
              <RefreshCw className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && stats && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{stats.total_tracks}</div>
            <div className="text-xs text-muted-foreground">Plays (30d)</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{stats.unique_tracks}</div>
            <div className="text-xs text-muted-foreground">Unique Tracks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{stats.unique_artists}</div>
            <div className="text-xs text-muted-foreground">Artists</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {formatDuration(stats.total_listening_time_ms)}
            </div>
            <div className="text-xs text-muted-foreground">Listen Time</div>
          </div>
          {stats.top_track && (
            <div className="col-span-2 mt-2 border-t border-border/50 pt-2">
              <div className="text-xs text-muted-foreground">Top Track</div>
              <div className="truncate text-sm font-medium">{stats.top_track}</div>
              <div className="text-xs text-muted-foreground">{stats.top_track_count} plays</div>
            </div>
          )}
          {stats.top_artist && (
            <div className="col-span-2 mt-2 border-t border-border/50 pt-2">
              <div className="text-xs text-muted-foreground">Top Artist</div>
              <div className="truncate text-sm font-medium">{stats.top_artist}</div>
              <div className="text-xs text-muted-foreground">{stats.top_artist_count} plays</div>
            </div>
          )}
        </div>
      )}

      {/* History List */}
      {expanded && (
        <div className="space-y-3">
          {Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="size-3" />
                {date}
                <span className="text-muted-foreground/60">({entries.length})</span>
              </div>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onPlayTrack?.(entry.track_uri)}
                    className="group flex w-full items-center gap-2 rounded-md p-1.5 text-left transition-colors hover:bg-muted"
                  >
                    {/* Album art */}
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      {entry.album_image_url ? (
                        <Image
                          src={entry.album_image_url}
                          alt={entry.album_name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-muted">
                          <Music className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      {/* Play overlay */}
                      {onPlayTrack && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <Play className="size-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Track info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{entry.track_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {entry.track_artists}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatRelativeTime(entry.played_at)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last sync info */}
      {syncInfo && (
        <div className="text-center text-[10px] text-muted-foreground/60">
          Last synced: {formatRelativeTime(syncInfo.lastSyncAt)}
        </div>
      )}
    </div>
  )
}
