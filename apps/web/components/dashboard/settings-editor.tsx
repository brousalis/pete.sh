'use client'

import { ColorThemePicker } from '@/components/color-theme'
import { DiagnosticsCard } from '@/components/dashboard/diagnostics-card'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { apiGet, apiPost } from '@/lib/api/client'
import { Activity, Apple, ChefHat, GitBranch, Layout, Loader2, Monitor, Palette, Settings, Sunrise, Watch } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
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

interface SanitizationPreview {
  ingredients: {
    total_scanned: number
    total_changed: number
    changes: { id: string; recipe_id: string; before: { name: string }; after: { name: string } }[]
  }
  cache: {
    total_recipes_scanned: number
    total_recipes_changed: number
    total_ingredients_changed: number
  }
}

export function SettingsEditor() {
  const { settings, isLoading, error, updateSettings } = useSettings()
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillPreview, setBackfillPreview] = useState<BackfillSummary | null>(null)
  const [routineBackfillLoading, setRoutineBackfillLoading] = useState(false)
  const [versionBackfillLoading, setVersionBackfillLoading] = useState(false)
  const [versionBackfillPreview, setVersionBackfillPreview] = useState<VersionBackfillSummary | null>(null)
  const [sanitizeLoading, setSanitizeLoading] = useState(false)
  const [sanitizePreview, setSanitizePreview] = useState<SanitizationPreview | null>(null)
  const [nutritionLoading, setNutritionLoading] = useState(false)
  const [nutritionProgress, setNutritionProgress] = useState<{
    total: number
    completed: number
    failed: number
    current_recipe?: string
    phase: string
  } | null>(null)
  const [nutritionResult, setNutritionResult] = useState<{
    total: number
    enriched: number
    failed: number
  } | null>(null)
  const nutritionAbortRef = useRef<AbortController | null>(null)

  // Preview ingredient sanitization (dry run)
  const handlePreviewSanitize = async () => {
    setSanitizeLoading(true)
    try {
      const response = await apiPost<SanitizationPreview>(
        '/api/cooking/recipes/sanitize-ingredients?dry_run=true'
      )
      if (response.success && response.data) {
        setSanitizePreview(response.data)
      } else {
        toast.error('Failed to preview sanitization')
      }
    } catch {
      toast.error('Failed to preview sanitization')
    } finally {
      setSanitizeLoading(false)
    }
  }

  // Execute ingredient sanitization
  const handleExecuteSanitize = async () => {
    setSanitizeLoading(true)
    try {
      const response = await apiPost<SanitizationPreview>(
        '/api/cooking/recipes/sanitize-ingredients?dry_run=false'
      )
      if (response.success && response.data) {
        const { ingredients, cache } = response.data
        toast.success(
          `Sanitized ${ingredients.total_changed} ingredients + ${cache.total_ingredients_changed} cached ingredients across ${cache.total_recipes_changed} recipes`
        )
        setSanitizePreview(null)
      } else {
        toast.error('Failed to execute sanitization')
      }
    } catch {
      toast.error('Failed to execute sanitization')
    } finally {
      setSanitizeLoading(false)
    }
  }

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

  const handleNutritionEnrich = useCallback(async (force = false) => {
    setNutritionLoading(true)
    setNutritionProgress(null)
    setNutritionResult(null)

    const abort = new AbortController()
    nutritionAbortRef.current = abort

    try {
      const url = `/api/cooking/nutrition/enrich-all${force ? '?force=true' : ''}`
      const response = await fetch(url, {
        method: 'POST',
        signal: abort.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const match = line.match(/^data:\s*(.+)$/m)
          if (!match?.[1]) continue

          try {
            const event = JSON.parse(match[1])
            if (event.type === 'progress') {
              setNutritionProgress({
                total: event.total,
                completed: event.completed,
                failed: event.failed,
                current_recipe: event.current_recipe,
                phase: event.phase,
              })
            } else if (event.type === 'complete') {
              setNutritionResult({
                total: event.total,
                enriched: event.enriched,
                failed: event.failed,
              })
              toast.success(
                `Enriched ${event.enriched} recipes with nutrition data` +
                (event.failed > 0 ? ` (${event.failed} failed)` : '')
              )
            } else if (event.type === 'error') {
              toast.error(`Enrichment error: ${event.error}`)
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Nutrition enrichment failed')
      }
    } finally {
      setNutritionLoading(false)
      nutritionAbortRef.current = null
    }
  }, [])

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

      {/* Display/KVM Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Monitor className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Display / KVM</CardTitle>
          </div>
          <CardDescription>
            Configure monitor input switching for your KVM setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Monitor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Monitor</label>
            <p className="text-muted-foreground mb-2 text-xs">
              Windows display identifier to control (e.g., DISPLAY1 for primary, DISPLAY2 for secondary)
            </p>
            <Select
              value={settings?.display_monitor ?? '\\\\.\\DISPLAY2'}
              onValueChange={async (value) => {
                await updateSettings({ display_monitor: value })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select monitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="\\.\DISPLAY1">DISPLAY1 (Primary)</SelectItem>
                <SelectItem value="\\.\DISPLAY2">DISPLAY2 (Secondary)</SelectItem>
                <SelectItem value="\\.\DISPLAY3">DISPLAY3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Input</label>
            <p className="text-muted-foreground mb-2 text-xs">
              The main input source for this monitor (usually your PC connection)
            </p>
            <Select
              value={settings?.display_primary_input ?? 'displayport'}
              onValueChange={async (value) => {
                await updateSettings({ display_primary_input: value as 'hdmi' | 'displayport' })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select input" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hdmi">HDMI</SelectItem>
                <SelectItem value="displayport">DisplayPort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Secondary Input</label>
            <p className="text-muted-foreground mb-2 text-xs">
              The alternate input source (e.g., work laptop, gaming console)
            </p>
            <Select
              value={settings?.display_secondary_input ?? 'hdmi'}
              onValueChange={async (value) => {
                await updateSettings({ display_secondary_input: value as 'hdmi' | 'displayport' })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select input" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hdmi">HDMI</SelectItem>
                <SelectItem value="displayport">DisplayPort</SelectItem>
              </SelectContent>
            </Select>
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
            Manage your fitness tracking data and activity dashboard integration
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
                Link historical workouts to your fitness routines.
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

      {/* Cooking Data Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ChefHat className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Cooking Data</CardTitle>
          </div>
          <CardDescription>
            Manage recipe data, ingredient cleanup, and nutrition enrichment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                Ingredient Sanitization
              </label>
              <p className="text-muted-foreground text-xs">
                Strip &ldquo;TJ&apos;s&rdquo; / &ldquo;Trader Joe&apos;s&rdquo; branding from ingredient names,
                extract preparation notes, and standardize formatting. Safe to re-run
                after syncing new recipes.
              </p>
            </div>

            {sanitizePreview && (
              <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <ChefHat className="size-4 text-orange-500" />
                  <span className="font-medium">Preview Results</span>
                </div>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>
                    Imported ingredients scanned:{' '}
                    <span className="text-foreground font-medium">
                      {sanitizePreview.ingredients.total_scanned}
                    </span>
                  </p>
                  <p>
                    Would change:{' '}
                    <span className="text-foreground font-medium">
                      {sanitizePreview.ingredients.total_changed}
                    </span>
                  </p>
                  <p>
                    Cached recipes scanned:{' '}
                    <span className="text-foreground font-medium">
                      {sanitizePreview.cache.total_recipes_scanned}
                    </span>
                  </p>
                  <p>
                    Cached ingredients would change:{' '}
                    <span className="text-foreground font-medium">
                      {sanitizePreview.cache.total_ingredients_changed}
                    </span>
                  </p>
                </div>
                {sanitizePreview.ingredients.total_changed === 0 &&
                  sanitizePreview.cache.total_ingredients_changed === 0 && (
                    <p className="text-muted-foreground mt-2 text-xs italic">
                      Everything is already clean — nothing to change.
                    </p>
                  )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewSanitize}
                disabled={sanitizeLoading}
              >
                {sanitizeLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <ChefHat className="mr-2 size-3" />
                )}
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExecuteSanitize}
                disabled={sanitizeLoading || !sanitizePreview}
              >
                {sanitizeLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <ChefHat className="mr-2 size-3" />
                )}
                Run Sanitization
              </Button>
            </div>
            {!sanitizePreview && (
              <p className="text-muted-foreground text-xs">
                Click Preview first to see how many ingredients will be cleaned up.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Nutrition Enrichment */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                Nutrition Enrichment
              </label>
              <p className="text-muted-foreground text-xs">
                Enrich all recipes with nutritional data from the USDA FoodData Central
                database. Resolves each ingredient to calories, protein, fat, carbs, fiber,
                sugar, and sodium per serving, then categorizes recipes (high-protein, low-carb,
                post-workout, etc.). Uses AI estimation for ingredients not found in USDA.
              </p>
            </div>

            {/* Progress display */}
            {nutritionProgress && !nutritionResult && (
              <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Apple className="size-4 text-green-500" />
                  <span className="font-medium">
                    {nutritionProgress.phase === 'dedup' && 'Deduplicating ingredients...'}
                    {nutritionProgress.phase === 'resolve' && 'Resolving ingredients via USDA...'}
                    {nutritionProgress.phase === 'enrich' && 'Enriching recipes...'}
                    {nutritionProgress.phase === 'done' && 'Complete!'}
                  </span>
                </div>
                {nutritionProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {nutritionProgress.completed} / {nutritionProgress.total} recipes
                        {nutritionProgress.failed > 0 && (
                          <span className="text-destructive"> ({nutritionProgress.failed} failed)</span>
                        )}
                      </span>
                      <span>{Math.round((nutritionProgress.completed / nutritionProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${(nutritionProgress.completed / nutritionProgress.total) * 100}%` }}
                      />
                    </div>
                    {nutritionProgress.current_recipe && (
                      <p className="text-xs text-muted-foreground truncate">
                        Current: {nutritionProgress.current_recipe}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Result display */}
            {nutritionResult && (
              <div className="bg-muted/50 rounded-lg border p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Apple className="size-4 text-green-500" />
                  <span className="font-medium">Enrichment Complete</span>
                </div>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>Total recipes: <span className="text-foreground font-medium">{nutritionResult.total}</span></p>
                  <p>Successfully enriched: <span className="text-foreground font-medium">{nutritionResult.enriched}</span></p>
                  {nutritionResult.failed > 0 && (
                    <p>Failed: <span className="text-destructive font-medium">{nutritionResult.failed}</span></p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNutritionEnrich(false)}
                disabled={nutritionLoading}
              >
                {nutritionLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <Apple className="mr-2 size-3" />
                )}
                Enrich New Recipes
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleNutritionEnrich(true)}
                disabled={nutritionLoading}
              >
                {nutritionLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <Apple className="mr-2 size-3" />
                )}
                Re-enrich All
              </Button>
              {nutritionLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => nutritionAbortRef.current?.abort()}
                >
                  Cancel
                </Button>
              )}
            </div>
            {!nutritionLoading && !nutritionResult && (
              <p className="text-muted-foreground text-xs">
                &ldquo;Enrich New&rdquo; processes only recipes without nutrition data.
                &ldquo;Re-enrich All&rdquo; reprocesses every recipe (useful after adding
                new ingredients to the USDA cache).
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ecosystem Diagnostics */}
      <DiagnosticsCard />
    </div>
  )
}
