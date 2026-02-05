'use client'

import { ColorThemePicker } from '@/components/color-theme'
import { useSettings } from '@/components/settings-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { apiGet, apiPost } from '@/lib/api/client'
import { Activity, GitBranch, Layout, Loader2, Palette, Settings, Sunrise, Watch } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface BackfillSummary {
  totalWorkouts: number
  processedWorkouts?: number
  wouldProcess?: number
  skippedWorkouts?: number
  wouldSkip?: number
  exercisesCompleted?: number
  dryRun?: boolean
  preview?: boolean
}

interface RoutineBackfillSummary {
  daysProcessed: number
  routinesCompleted: number
  dryRun: boolean
  dateRange: { start: string; end: string }
}

interface VersionBackfillSummary {
  weeksProcessed: number
  completionsUpdated?: number
  completionsSkipped?: number
  wouldUpdate?: number
  alreadyStamped?: number
  dryRun?: boolean
  preview?: boolean
}

export function SettingsEditor() {
  const { settings, isLoading, error, updateSettings } = useSettings()
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillPreview, setBackfillPreview] = useState<BackfillSummary | null>(null)
  const [routineBackfillLoading, setRoutineBackfillLoading] = useState(false)
  const [versionBackfillLoading, setVersionBackfillLoading] = useState(false)
  const [versionBackfillPreview, setVersionBackfillPreview] = useState<VersionBackfillSummary | null>(null)

  // Preview backfill
  const handlePreviewBackfill = async () => {
    setBackfillLoading(true)
    try {
      const response = await apiGet<{ summary: BackfillSummary }>('/api/fitness/backfill')
      if (response.success && response.data) {
        setBackfillPreview(response.data.summary)
      } else {
        toast.error('Failed to preview backfill')
      }
    } catch (err) {
      toast.error('Failed to preview backfill')
    } finally {
      setBackfillLoading(false)
    }
  }

  // Execute backfill
  const handleExecuteBackfill = async () => {
    setBackfillLoading(true)
    try {
      const response = await apiPost<{ summary: BackfillSummary }>('/api/fitness/backfill', {
        dryRun: false,
      })
      if (response.success && response.data) {
        const summary = response.data.summary
        toast.success(
          `Backfill complete! Processed ${summary.processedWorkouts} workouts, ` +
          `completed ${summary.exercisesCompleted} exercises`
        )
        setBackfillPreview(null)
      } else {
        toast.error('Failed to execute backfill')
      }
    } catch (err) {
      toast.error('Failed to execute backfill')
    } finally {
      setBackfillLoading(false)
    }
  }

  // Execute routine backfill for January 2026
  const handleRoutineBackfill = async () => {
    setRoutineBackfillLoading(true)
    try {
      const response = await apiPost<{ summary: RoutineBackfillSummary }>('/api/fitness/backfill-routines', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        types: ['morning', 'night'],
      })
      if (response.success && response.data) {
        const summary = response.data.summary
        toast.success(
          `Routine backfill complete! Marked ${summary.routinesCompleted} routines complete across ${summary.daysProcessed} days`
        )
      } else {
        toast.error('Failed to execute routine backfill')
      }
    } catch (err) {
      toast.error('Failed to execute routine backfill')
    } finally {
      setRoutineBackfillLoading(false)
    }
  }

  // Preview version ID backfill
  const handlePreviewVersionBackfill = async () => {
    setVersionBackfillLoading(true)
    try {
      const response = await apiGet<{ summary: VersionBackfillSummary }>('/api/fitness/backfill-version-ids')
      if (response.success && response.data) {
        setVersionBackfillPreview(response.data.summary)
      } else {
        toast.error('Failed to preview version backfill')
      }
    } catch {
      toast.error('Failed to preview version backfill')
    } finally {
      setVersionBackfillLoading(false)
    }
  }

  // Execute version ID backfill
  const handleExecuteVersionBackfill = async () => {
    setVersionBackfillLoading(true)
    try {
      const response = await apiPost<{ summary: VersionBackfillSummary }>('/api/fitness/backfill-version-ids', {
        dryRun: false,
      })
      if (response.success && response.data) {
        const summary = response.data.summary
        toast.success(
          `Version backfill complete! Updated ${summary.completionsUpdated} completions ` +
          `across ${summary.weeksProcessed} weeks`
        )
        setVersionBackfillPreview(null)
      } else {
        toast.error('Failed to execute version backfill')
      }
    } catch {
      toast.error('Failed to execute version backfill')
    } finally {
      setVersionBackfillLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
          <Settings className="text-muted-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure your dashboard preferences
          </p>
        </div>
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Layout Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layout className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Layout</CardTitle>
          </div>
          <CardDescription>
            Customize the appearance of your dashboard layout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rounded Layout Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="rounded-layout"
                className="cursor-pointer text-sm font-medium"
              >
                Rounded layout
              </label>
              <p className="text-muted-foreground text-xs">
                Apply rounded corners to the main dashboard container
              </p>
            </div>
            <Switch
              id="rounded-layout"
              checked={settings?.rounded_layout ?? true}
              onCheckedChange={async checked => {
                await updateSettings({ rounded_layout: checked })
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <p className="text-muted-foreground mb-2 text-xs">
              Switch between light and dark mode
            </p>
            <ThemeToggle />
          </div>

          {/* Color Theme */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Accent color</label>
            <p className="text-muted-foreground mb-2 text-xs">
              Choose your preferred accent color
            </p>
            <ColorThemePicker />
          </div>
        </CardContent>
      </Card>

      {/* Fitness Data Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Fitness Data</CardTitle>
          </div>
          <CardDescription>
            Manage your fitness tracking data and Apple Watch integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* HealthKit Backfill */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                HealthKit Workout Backfill
              </label>
              <p className="text-muted-foreground text-xs">
                Link historical Apple Watch workouts to your fitness routines.
                This will auto-complete exercises based on your synced workout data.
              </p>
            </div>

            {backfillPreview && (
              <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Watch className="size-4 text-red-500" />
                  <span className="font-medium">Preview Results</span>
                </div>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>Total workouts found: <span className="text-foreground font-medium">{backfillPreview.totalWorkouts}</span></p>
                  <p>Would process: <span className="text-foreground font-medium">{backfillPreview.wouldProcess ?? backfillPreview.processedWorkouts ?? 0}</span></p>
                  <p>Would skip (already linked): <span className="text-foreground font-medium">{backfillPreview.wouldSkip ?? backfillPreview.skippedWorkouts ?? 0}</span></p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewBackfill}
                disabled={backfillLoading}
              >
                {backfillLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <Watch className="mr-2 size-3" />
                )}
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExecuteBackfill}
                disabled={backfillLoading || (!backfillPreview)}
              >
                {backfillLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <Activity className="mr-2 size-3" />
                )}
                Run Backfill
              </Button>
            </div>
            {!backfillPreview && (
              <p className="text-muted-foreground text-xs">
                Click Preview first to see how many workouts will be processed.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Daily Routines Backfill */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                Daily Routines Backfill
              </label>
              <p className="text-muted-foreground text-xs">
                Mark all morning and night stretch routines as complete for January 2026.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRoutineBackfill}
              disabled={routineBackfillLoading}
            >
              {routineBackfillLoading ? (
                <Loader2 className="mr-2 size-3 animate-spin" />
              ) : (
                <Sunrise className="mr-2 size-3" />
              )}
              Complete January Routines
            </Button>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Version ID Backfill */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                Routine Version Backfill
              </label>
              <p className="text-muted-foreground text-xs">
                Stamp historical workout and routine completions with the routine version
                that was active when they were recorded. This preserves accuracy when
                migrating to new routine versions.
              </p>
            </div>

            {versionBackfillPreview && (
              <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <GitBranch className="size-4 text-blue-500" />
                  <span className="font-medium">Preview Results</span>
                </div>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>Weeks scanned: <span className="text-foreground font-medium">{versionBackfillPreview.weeksProcessed}</span></p>
                  <p>Would update: <span className="text-foreground font-medium">{versionBackfillPreview.wouldUpdate ?? versionBackfillPreview.completionsUpdated ?? 0}</span> completions</p>
                  <p>Already stamped: <span className="text-foreground font-medium">{versionBackfillPreview.alreadyStamped ?? versionBackfillPreview.completionsSkipped ?? 0}</span></p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewVersionBackfill}
                disabled={versionBackfillLoading}
              >
                {versionBackfillLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <GitBranch className="mr-2 size-3" />
                )}
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExecuteVersionBackfill}
                disabled={versionBackfillLoading || (!versionBackfillPreview)}
              >
                {versionBackfillLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <Activity className="mr-2 size-3" />
                )}
                Run Backfill
              </Button>
            </div>
            {!versionBackfillPreview && (
              <p className="text-muted-foreground text-xs">
                Click Preview first to see how many completions need version stamping.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
