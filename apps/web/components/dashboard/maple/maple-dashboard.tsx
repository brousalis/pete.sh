'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiGet } from '@/lib/api/client'
import type { MapleWalk } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { Dog, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { MapleAddWalkDialog } from './maple-add-walk-dialog'
import { MapleMoodBreakdown, MapleStatsCards, MapleStatsOverview } from './maple-stats'
import { MapleWalkList } from './maple-walk-card'
import { MapleWalkDetail } from './maple-walk-detail'

interface MapleDashboardProps {
  className?: string
}

type ViewMode = 'list' | 'detail'

export function MapleDashboard({ className }: MapleDashboardProps) {
  const [walks, setWalks] = useState<MapleWalk[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchWalks()
  }, [fetchWalks, refreshKey])

  // Handle walk created
  const handleWalkCreated = (walk: MapleWalk) => {
    setWalks((prev) => [walk, ...prev])
    setRefreshKey((k) => k + 1) // Refresh stats
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
    <div className={cn('space-y-6', className)}>
      {/* Hero Section */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 p-8 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30">
            {/* Dog emoji as placeholder - could be replaced with actual photo */}
            <div className="mb-4 flex size-24 items-center justify-center rounded-full bg-white/50 text-6xl shadow-lg dark:bg-black/20">
              🐕
            </div>
            <h1 className="mb-2 text-3xl font-bold">Maple's Walks</h1>
            <p className="mb-4 text-muted-foreground">Track and remember all of Maple's adventures</p>

            {/* Quick stats */}
            <MapleStatsOverview className="mt-2" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <MapleStatsCards />

      {/* Actions Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Walks</h2>
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
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Walk List */}
        <div className="lg:col-span-2">
          <MapleWalkList
            walks={walks}
            onWalkClick={handleWalkClick}
            selectedId={selectedWalkId || undefined}
            loading={loading}
            emptyMessage="No walks recorded yet. Add your first walk!"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Mood Breakdown */}
          <MapleMoodBreakdown />

          {/* Quick Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Dog className="size-4" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Recording walks:</strong> Just start an "Outdoor Walk" on your Apple Watch
                when you head out with Maple.
              </p>
              <p>
                <strong>Syncing:</strong> Sync your workout from the iOS app, then add it here as a
                Maple walk.
              </p>
              <p>
                <strong>Mood ratings:</strong> Help track how Maple's behavior was - great for
                noticing patterns!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Walk Dialog */}
      <MapleAddWalkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onWalkCreated={handleWalkCreated}
      />
    </div>
  )
}
