'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  History,
  CheckCircle2,
  Clock,
  FileEdit,
  RotateCcw,
  Eye,
  Trash2,
  RefreshCw,
  GitBranch,
  Sparkles
} from 'lucide-react'
import { apiPost } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import type { VersionsListResponse, RoutineVersionSummary } from '@/lib/types/routine-editor.types'

interface VersionHistoryProps {
  routineId: string
  currentVersionId: string
  versions: VersionsListResponse | null
  onVersionSelect: (versionId: string) => void
  onRestore: (versionId: string) => void
  onRefresh: () => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

interface VersionItemProps {
  version: RoutineVersionSummary
  isSelected: boolean
  onSelect: () => void
  onRestore: () => void
}

function VersionItem({ version, isSelected, onSelect, onRestore }: VersionItemProps) {
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)

  return (
    <>
      <Card
        className={`cursor-pointer transition-all ${
          isSelected
            ? 'ring-2 ring-primary bg-primary/5'
            : 'hover:bg-accent/50'
        } ${version.isActive ? 'border-green-500/50' : ''} ${version.isDraft ? 'border-amber-500/50' : ''}`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{version.name}</span>
                <Badge variant="outline" className="text-xs font-mono">
                  v{version.versionNumber}
                </Badge>
              </div>

              {version.changeSummary && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {version.changeSummary}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(version.createdAt)}
                </span>
                {version.activatedAt && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Activated {formatRelativeTime(version.activatedAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {version.isActive && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              {version.isDraft && (
                <Badge variant="outline" className="text-amber-600 border-amber-500">
                  <FileEdit className="h-3 w-3 mr-1" />
                  Draft
                </Badge>
              )}
              {!version.isActive && !version.isDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowRestoreDialog(true)
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restore
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new draft based on <strong>{version.name}</strong> (v{version.versionNumber}).
              Your current draft (if any) will be preserved until you publish the restored version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onRestore()
              setShowRestoreDialog(false)
            }}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function VersionHistory({
  routineId,
  currentVersionId,
  versions,
  onVersionSelect,
  onRestore,
  onRefresh
}: VersionHistoryProps) {
  const { toast } = useToast()
  const [isCleaning, setIsCleaning] = useState(false)
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)

  // Handle local mode (json-fallback)
  const isLocalMode = currentVersionId === 'json-fallback'

  const handleCleanup = async () => {
    setIsCleaning(true)
    try {
      const response = await apiPost<{ kept: object; deleted: number }>('/api/fitness/routine/versions/cleanup', {
        routineId,
      })

      if (response.success && response.data) {
        toast({
          title: 'Cleanup complete',
          description: `Removed ${response.data.deleted} duplicate version${response.data.deleted !== 1 ? 's' : ''}.`,
        })
        onRefresh()
      } else {
        throw new Error('Cleanup failed')
      }
    } catch (error) {
      toast({
        title: 'Cleanup failed',
        description: 'Could not clean up versions. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCleaning(false)
      setShowCleanupDialog(false)
    }
  }

  if (isLocalMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
          <CardDescription>
            Local file mode - changes save directly to your files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <GitBranch className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              You&apos;re editing local JSON files directly.
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              To enable version history, configure Supabase in your environment.
              Your changes are saved to <code className="bg-muted px-1 rounded">fitness-routine.json</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!versions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  const { versions: versionList, activeVersion, draftVersion } = versions

  if (versionList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
          <CardDescription>
            No versions yet. Your routine will be versioned when you save changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Start editing your routine to create your first version.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show cleanup option if there are many versions or version numbers are out of order
  const hasVersionIssues = versionList.length > 3 ||
    (draftVersion && activeVersion && draftVersion.versionNumber < activeVersion.versionNumber)

  return (
    <div className="space-y-4">
      {/* Cleanup warning */}
      {hasVersionIssues && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Version cleanup recommended</p>
                  <p className="text-xs text-muted-foreground">
                    {versionList.length} versions found. Clean up to keep only active + latest draft.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCleanupDialog(true)}
                disabled={isCleaning}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Clean Up
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cleanup confirmation dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clean Up Versions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete duplicate and old versions, keeping only:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The current active version{activeVersion && ` (v${activeVersion.versionNumber})`}</li>
                <li>The newest draft (if newer than active)</li>
              </ul>
              <p className="mt-2 text-amber-600">
                {versionList.length - 2} version{versionList.length - 2 !== 1 ? 's' : ''} will be deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanup} disabled={isCleaning}>
              {isCleaning ? 'Cleaning...' : 'Clean Up'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Version History
              </CardTitle>
              <CardDescription>
                {versionList.length} version{versionList.length !== 1 ? 's' : ''}
                {activeVersion && ` · Active: v${activeVersion.versionNumber}`}
                {draftVersion && ` · Draft: v${draftVersion.versionNumber}`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4 pl-10 relative">
              {versionList.map((version, index) => (
                <div key={version.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[2.375rem] top-5 w-2.5 h-2.5 rounded-full border-2 bg-background transition-colors ${
                      version.isActive
                        ? 'border-green-500 bg-green-500'
                        : version.isDraft
                          ? 'border-amber-500 bg-amber-500/30'
                          : 'border-muted-foreground/50'
                    }`}
                  />

                  <VersionItem
                    version={version}
                    isSelected={version.id === currentVersionId}
                    onSelect={() => onVersionSelect(version.id)}
                    onRestore={() => onRestore(version.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Version Details */}
      {currentVersionId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Viewing Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const current = versionList.find(v => v.id === currentVersionId)
              if (!current) return null

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{current.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      v{current.versionNumber}
                    </Badge>
                    {current.isActive && (
                      <Badge className="bg-green-500 text-white text-xs">Active</Badge>
                    )}
                    {current.isDraft && (
                      <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">
                        Draft
                      </Badge>
                    )}
                  </div>
                  {current.changeSummary && (
                    <p className="text-sm text-muted-foreground">{current.changeSummary}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(current.createdAt)}
                  </p>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
