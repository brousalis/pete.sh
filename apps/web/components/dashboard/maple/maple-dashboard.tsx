'use client'

import { Button } from '@/components/ui/button'
import { PageHeader, PageHeaderRow } from '@/components/ui/page-header'
import { apiGet } from '@/lib/api/client'
import type { MapleStats, MapleWalk } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { MapleAddWalkDialog } from './maple-add-walk-dialog'
import { MapleMoodBreakdown, MapleStatsStrip } from './maple-stats'
import { MapleWalkList } from './maple-walk-card'
import { MapleWalkDetail } from './maple-walk-detail'

interface MapleDashboardProps {
  className?: string
}

type ViewMode = 'list' | 'detail'

export function MapleDashboard({ className }: MapleDashboardProps) {
  const [walks, setWalks] = useState<MapleWalk[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MapleStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedWalkId, setSelectedWalkId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch walks
  const fetchWalks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiGet<MapleWalk[]>('/api/maple/walks')
      if (response.success && response.data) {
        setWalks(response.data)
      }
    } catch (err) {
      console.error('Error fetching walks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch stats (single source of truth - passed to children)
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const response = await apiGet<MapleStats>('/api/maple/stats')
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWalks()
  }, [fetchWalks, refreshKey])

  useEffect(() => {
    fetchStats()
  }, [fetchStats, refreshKey])

  // Handle walk created
  const handleWalkCreated = (walk: MapleWalk) => {
    setWalks((prev) => [walk, ...prev])
    setRefreshKey((k) => k + 1) // Refresh walks and stats
  }

  // Handle walk click
  const handleWalkClick = (walk: MapleWalk) => {
    setSelectedWalkId(walk.id)
    setViewMode('detail')
  }

  // Handle back from detail
  const handleBack = () => {
    setViewMode('list')
    setSelectedWalkId(null)
  }

  // Handle delete
  const handleDeleted = () => {
    setWalks((prev) => prev.filter((w) => w.id !== selectedWalkId))
    setViewMode('list')
    setSelectedWalkId(null)
    setRefreshKey((k) => k + 1)
  }

  // Refresh handler
  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
    fetchWalks()
  }

  // Render detail view
  if (viewMode === 'detail' && selectedWalkId) {
    return (
      <div className={className}>
        <MapleWalkDetail
          walkId={selectedWalkId}
          onBack={handleBack}
          onDeleted={handleDeleted}
        />
      </div>
    )
  }

  // Render list view
  return (
    <div className={cn('space-y-4', className)}>
      {/* Compact header with stats */}
      <PageHeader>
        <PageHeaderRow className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐕</span>
            <div>
              <h1 className="text-xl font-bold">Maple&apos;s Walks</h1>
              <p className="text-xs text-muted-foreground">
                Track and remember all of Maple&apos;s adventures
              </p>
            </div>
          </div>
          <MapleStatsStrip stats={stats} loading={statsLoading} />
        </PageHeaderRow>
      </PageHeader>

      {/* Actions Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Walks</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Walk
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MapleWalkList
            walks={walks}
            onWalkClick={handleWalkClick}
            selectedId={selectedWalkId || undefined}
            loading={loading}
            emptyMessage="No walks recorded yet. Add your first walk!"
            compact
          />
        </div>
        <div className="space-y-4">
          <MapleMoodBreakdown stats={stats} loading={statsLoading} />
        </div>
      </div>

      <MapleAddWalkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onWalkCreated={handleWalkCreated}
      />
    </div>
  )
}
