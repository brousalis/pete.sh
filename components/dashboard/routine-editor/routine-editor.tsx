'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { apiGet, apiPost, apiPut } from '@/lib/api/client'
import { 
  Save, 
  History, 
  RefreshCw, 
  AlertCircle,
  User,
  Calendar,
  Dumbbell,
  Moon,
  Sun,
  CheckCircle2,
  Clock,
  FileEdit
} from 'lucide-react'
import type { 
  RoutineVersion, 
  VersionsListResponse,
  EditorTab,
} from '@/lib/types/routine-editor.types'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { ProfileEditor } from './profile-editor'
import { ScheduleEditor } from './schedule-editor'
import { InjuryProtocolEditor } from './injury-protocol-editor'
import { WorkoutDayEditor } from './workout-day-editor'
import { DailyRoutineEditor } from './daily-routine-editor'
import { VersionHistory } from './version-history'

interface RoutineEditorProps {
  routineId?: string
}

export function RoutineEditor({ routineId = 'climber-physique' }: RoutineEditorProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<EditorTab>('overview')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<RoutineVersion | null>(null)
  const [draftVersion, setDraftVersion] = useState<RoutineVersion | null>(null)
  const [versions, setVersions] = useState<VersionsListResponse | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const isCreatingVersion = useRef(false)
  const hasLoadedOnce = useRef(false)

  // Load versions and current data
  const loadData = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate loading in StrictMode (unless force refresh)
    if (hasLoadedOnce.current && !forceRefresh) return
    
    setIsLoading(true)
    try {
      // Get all versions
      const versionsResponse = await apiGet<VersionsListResponse>(`/api/fitness/routine/versions?routineId=${routineId}`)
      if (!versionsResponse.success || !versionsResponse.data) {
        throw new Error('Failed to fetch versions')
      }
      const versionsData = versionsResponse.data
      setVersions(versionsData)

      // If there's a draft, load it; otherwise load active version
      if (versionsData.draftVersion) {
        const draftResponse = await apiGet<RoutineVersion>(`/api/fitness/routine/versions/${versionsData.draftVersion.id}`)
        if (draftResponse.success && draftResponse.data) {
          setDraftVersion(draftResponse.data)
          setCurrentVersion(draftResponse.data)
        }
      } else if (versionsData.activeVersion) {
        const activeResponse = await apiGet<RoutineVersion>(`/api/fitness/routine/versions/${versionsData.activeVersion.id}`)
        if (activeResponse.success && activeResponse.data) {
          setCurrentVersion(activeResponse.data)
          // For json-fallback, treat it as a draft since changes save directly to files
          if (activeResponse.data.id === 'json-fallback') {
            setDraftVersion(activeResponse.data)
          } else {
            setDraftVersion(null)
          }
        }
      } else if (!isCreatingVersion.current) {
        // No versions exist, create initial from current data (only once)
        isCreatingVersion.current = true
        try {
          const newVersionResponse = await apiPost<RoutineVersion>('/api/fitness/routine/versions', {
            routineId,
            name: 'Initial Version',
            changeSummary: 'Initial version from existing routine',
          })
          if (newVersionResponse.success && newVersionResponse.data) {
            setDraftVersion(newVersionResponse.data)
            setCurrentVersion(newVersionResponse.data)
          }
        } finally {
          isCreatingVersion.current = false
        }
      }
      hasLoadedOnce.current = true
    } catch (error) {
      toast({
        title: 'Error loading routine',
        description: 'Failed to load routine data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [routineId, toast])

  useEffect(() => {
    if (!hasLoadedOnce.current) {
      loadData()
    }
  }, [loadData])

  // Create a new draft if editing and no draft exists
  // For json-fallback mode, just return the current version (edits save directly)
  const ensureDraft = useCallback(async (): Promise<RoutineVersion | null> => {
    if (draftVersion) return draftVersion
    
    // For json-fallback, use the current version directly
    if (currentVersion?.id === 'json-fallback') {
      setDraftVersion(currentVersion)
      return currentVersion
    }

    try {
      const response = await apiPost<RoutineVersion>('/api/fitness/routine/versions', {
        routineId,
        changeSummary: 'Draft changes',
      })
      if (response.success && response.data) {
        setDraftVersion(response.data)
        setCurrentVersion(response.data)
        return response.data
      }
      throw new Error('Failed to create draft')
    } catch (error) {
      toast({
        title: 'Error creating draft',
        description: 'Failed to create draft version.',
        variant: 'destructive',
      })
      return null
    }
  }, [draftVersion, currentVersion, routineId, toast])

  // Save changes to draft
  const saveChanges = useCallback(async (updates: Partial<RoutineVersion>) => {
    const draft = await ensureDraft()
    if (!draft) return

    setIsSaving(true)
    try {
      const response = await apiPut<RoutineVersion>(`/api/fitness/routine/versions/${draft.id}`, updates)
      if (response.success && response.data) {
        setDraftVersion(response.data)
        setCurrentVersion(response.data)
        setIsDirty(false)
        setLastSaved(new Date().toISOString())
        toast({
          title: 'Changes saved',
          description: 'Your changes have been saved to the draft.',
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Error saving',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [ensureDraft, toast])

  // Publish (activate) the draft
  const publishVersion = useCallback(async () => {
    if (!draftVersion) return

    setIsSaving(true)
    try {
      const response = await apiPost<RoutineVersion>(`/api/fitness/routine/versions/${draftVersion.id}/activate`, {})
      if (response.success && response.data) {
        // Update the published version to show it's now active
        const publishedVersion = { ...response.data, isActive: true, isDraft: false }
        setCurrentVersion(publishedVersion)
        setDraftVersion(null) // Clear draft - we're now viewing the active version
        setIsDirty(false)
        
        // Refresh versions list to get updated active/draft status
        const versionsResponse = await apiGet<VersionsListResponse>(`/api/fitness/routine/versions?routineId=${routineId}`)
        if (versionsResponse.success && versionsResponse.data) {
          setVersions(versionsResponse.data)
        }
        
        toast({
          title: 'Published!',
          description: `Version ${publishedVersion.versionNumber} is now active.`,
        })
      } else {
        throw new Error('Failed to publish')
      }
    } catch (error) {
      toast({
        title: 'Error publishing',
        description: 'Failed to publish changes. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [draftVersion, routineId, toast])

  // Handle field updates
  const handleUpdate = useCallback((field: string, value: unknown) => {
    if (!currentVersion) return
    
    setCurrentVersion(prev => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
    setIsDirty(true)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!currentVersion) {
    return (
      <Card className="m-4">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No routine found</p>
          <Button onClick={() => loadData(true)} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isLocalMode = currentVersion.id === 'json-fallback'
  const activeVersion = versions?.activeVersion
  const isEditingDraft = draftVersion && !isLocalMode
  const hasUnsavedChanges = isDirty

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{currentVersion.name}</h2>
              {!isLocalMode && (
                <span className="text-sm text-muted-foreground">
                  v{currentVersion.versionNumber}
                </span>
              )}
            </div>
            {/* Status line */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isLocalMode ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Editing local files directly
                </span>
              ) : isEditingDraft ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Editing draft
                  {activeVersion && activeVersion.id !== draftVersion?.id && (
                    <span className="text-muted-foreground/70">
                      • v{activeVersion.versionNumber} is active
                    </span>
                  )}
                </span>
              ) : currentVersion.isActive ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Active version
                </span>
              ) : null}
              {lastSaved && (
                <span className="flex items-center gap-1 ml-2">
                  <Clock className="h-3 w-3" />
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs">
              Unsaved
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => saveChanges(currentVersion)}
            disabled={!hasUnsavedChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLocalMode ? 'Save' : 'Save Draft'}
          </Button>
          {isEditingDraft && (
            <Button 
              size="sm" 
              onClick={publishVersion}
              disabled={isSaving || hasUnsavedChanges}
              title={hasUnsavedChanges ? 'Save your changes first' : 'Make this version active'}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Publish v{currentVersion.versionNumber}
            </Button>
          )}
          {!isLocalMode && !isEditingDraft && currentVersion.isActive && (
            <Button 
              variant="outline"
              size="sm" 
              onClick={async () => {
                // Create a new draft to start editing
                const draft = await ensureDraft()
                if (draft) {
                  toast({
                    title: 'Draft created',
                    description: 'You can now edit and publish when ready.',
                  })
                }
              }}
              disabled={isSaving}
            >
              Create New Version
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as EditorTab)} 
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="workouts" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="daily-routines" className="gap-2">
            <Sun className="h-4 w-4" />
            Daily Routines
          </TabsTrigger>
          <TabsTrigger value="versions" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-auto p-4 space-y-4">
          {/* Status Summary Card */}
          {!isLocalMode && (
            <Card className={`border-l-4 ${isEditingDraft ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-green-500 bg-green-500/5'}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isEditingDraft ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <FileEdit className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Editing Draft v{currentVersion.versionNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeVersion ? `Active: v${activeVersion.versionNumber}` : 'No active version yet'}
                            {hasUnsavedChanges ? ' • Save your changes before publishing' : ' • Ready to publish'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Active Version v{currentVersion.versionNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            This version is live • Create a new version to make changes
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {versions && versions.versions.length > 1 && (
                    <Badge variant="outline" className="text-xs">
                      {versions.versions.length} versions
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <ProfileEditor 
              profile={currentVersion.userProfile}
              name={currentVersion.name}
              onUpdate={(profile, name) => {
                handleUpdate('userProfile', profile)
                if (name) handleUpdate('name', name)
              }}
            />
            <InjuryProtocolEditor 
              protocol={currentVersion.injuryProtocol}
              onUpdate={(protocol) => handleUpdate('injuryProtocol', protocol)}
            />
          </div>
          <ScheduleEditor 
            schedule={currentVersion.schedule}
            onUpdate={(schedule) => handleUpdate('schedule', schedule)}
          />
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="flex-1 overflow-auto p-4">
          <WorkoutDayEditor
            workoutDefinitions={currentVersion.workoutDefinitions}
            schedule={currentVersion.schedule}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onUpdate={(definitions) => handleUpdate('workoutDefinitions', definitions)}
          />
        </TabsContent>

        {/* Daily Routines Tab */}
        <TabsContent value="daily-routines" className="flex-1 overflow-auto p-4">
          <DailyRoutineEditor
            dailyRoutines={currentVersion.dailyRoutines}
            onUpdate={(routines) => handleUpdate('dailyRoutines', routines)}
          />
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="flex-1 overflow-auto p-4">
          <VersionHistory
            routineId={routineId}
            currentVersionId={currentVersion.id}
            versions={versions}
            onVersionSelect={async (versionId) => {
              const response = await apiGet<RoutineVersion>(`/api/fitness/routine/versions/${versionId}`)
              if (response.success && response.data) {
                setCurrentVersion(response.data)
              }
            }}
            onRestore={async (versionId) => {
              const response = await apiPost<RoutineVersion>('/api/fitness/routine/versions', {
                routineId,
                basedOnVersionId: versionId,
                changeSummary: 'Restored from previous version',
              })
              if (response.success && response.data) {
                setDraftVersion(response.data)
                setCurrentVersion(response.data)
                await loadData(true)
              }
            }}
            onRefresh={() => loadData(true)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
