'use client'

import { useState, useEffect } from 'react'
import { History, RotateCcw, Calendar, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { apiGet, apiPost } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import type { RecipeVersion } from '@/lib/types/cooking.types'
import { formatDistanceToNow } from 'date-fns'

interface RecipeVersionHistoryProps {
  recipeId: string
  onRestore?: () => void
}

export function RecipeVersionHistory({ recipeId, onRestore }: RecipeVersionHistoryProps) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<RecipeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<RecipeVersion | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [recipeId])

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const response = await apiGet<RecipeVersion[]>(
        `/api/cooking/recipes/${recipeId}/versions`
      )

      if (response.success && response.data) {
        setVersions(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (version: RecipeVersion) => {
    setSelectedVersion(version)
    setRestoreDialogOpen(true)
  }

  const confirmRestore = async () => {
    if (!selectedVersion) return

    setRestoring(selectedVersion.id)
    try {
      const response = await apiPost(
        `/api/cooking/recipes/${recipeId}/versions/${selectedVersion.id}`,
        {}
      )

      if (response.success) {
        toast({
          title: 'Success',
          description: `Recipe restored to version ${selectedVersion.version_number}`,
        })
        setRestoreDialogOpen(false)
        setSelectedVersion(null)
        onRestore?.()
      } else {
        throw new Error(response.error || 'Failed to restore version')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore version',
        variant: 'destructive',
      })
    } finally {
      setRestoring(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Loading version history...</p>
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <History className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No version history yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-3"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      v{version.version_number}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {version.commit_message && (
                    <p className="text-sm flex items-start gap-2">
                      <MessageSquare className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{version.commit_message}</span>
                    </p>
                  )}
                  {version.created_by && (
                    <p className="text-xs text-muted-foreground">by {version.created_by}</p>
                  )}
                </div>
                {index > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(version)}
                    disabled={restoring === version.id}
                  >
                    <RotateCcw className="size-4 mr-1" />
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this recipe to version{' '}
              {selectedVersion?.version_number}? This will create a new version with the restored
              content.
            </DialogDescription>
          </DialogHeader>
          {selectedVersion?.commit_message && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-1">Commit message:</p>
              <p className="text-sm text-muted-foreground">{selectedVersion.commit_message}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRestore} disabled={restoring !== null}>
              {restoring ? 'Restoring...' : 'Restore'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
