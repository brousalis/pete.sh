'use client'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import { apiGet, apiPost, apiPut } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type { DayOfWeek, Workout } from '@/lib/types/fitness.types'
import type {
  RoutineVersion,
  VersionsListResponse,
} from '@/lib/types/routine-editor.types'
import type { RoutineChangeDiffEntry } from '@/lib/utils/routine-change-utils'
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  Save,
  Sun,
  Undo2,
  User,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AiCoachInline } from './ai-coach-inline'
import { DailyRoutineEditor } from './daily-routine-editor'
import { InjuryProtocolEditor } from './injury-protocol-editor'
import { ProfileEditor } from './profile-editor'
import { ScheduleEditor } from './schedule-editor'
import { VersionHistory } from './version-history'
import { WorkoutDayEditor } from './workout-day-editor'

interface RoutineEditorProps {
  routineId?: string
  onBack?: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type NavSection =
  | 'overview'
  | 'schedule'
  | 'workout'
  | 'daily-routines'
  | 'versions'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}
const DAY_SHORT: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const FOCUS_DOT_COLORS: Record<string, string> = {
  strength: 'bg-red-400',
  core: 'bg-orange-400',
  cardio: 'bg-blue-400',
  hiit: 'bg-purple-400',
  recovery: 'bg-green-400',
  conditioning: 'bg-cyan-400',
  hybrid: 'bg-amber-400',
  endurance: 'bg-indigo-400',
  rest: 'bg-slate-400',
  circuit: 'bg-pink-400',
}

function getFocusDot(focus: string): string {
  const lower = focus.toLowerCase()
  for (const [key, value] of Object.entries(FOCUS_DOT_COLORS)) {
    if (lower.includes(key)) return value
  }
  return 'bg-slate-400'
}

export function RoutineEditor({
  routineId = 'climber-physique',
  onBack,
}: RoutineEditorProps) {
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState<NavSection>('overview')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday')
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<RoutineVersion | null>(
    null
  )
  const [draftVersion, setDraftVersion] = useState<RoutineVersion | null>(null)
  const [versions, setVersions] = useState<VersionsListResponse | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showBackDialog, setShowBackDialog] = useState(false)
  const [aiCoachOpen, setAiCoachOpen] = useState(false)
  const [undoStack, setUndoStack] = useState<
    Array<{
      workoutDefinitions: Record<DayOfWeek, Workout>
      commitMessage: string
      timestamp: number
    }>
  >([])
  const isCreatingVersion = useRef(false)
  const hasLoadedOnce = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentVersionRef = useRef(currentVersion)
  currentVersionRef.current = currentVersion

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (hasLoadedOnce.current && !forceRefresh) return

      setIsLoading(true)
      try {
        const versionsResponse = await apiGet<VersionsListResponse>(
          `/api/fitness/routine/versions?routineId=${routineId}`
        )
        if (!versionsResponse.success || !versionsResponse.data) {
          throw new Error('Failed to fetch versions')
        }
        const versionsData = versionsResponse.data
        setVersions(versionsData)

        if (versionsData.draftVersion) {
          const draftResponse = await apiGet<RoutineVersion>(
            `/api/fitness/routine/versions/${versionsData.draftVersion.id}`
          )
          if (draftResponse.success && draftResponse.data) {
            setDraftVersion(draftResponse.data)
            setCurrentVersion(draftResponse.data)
          }
        } else if (versionsData.activeVersion) {
          const activeResponse = await apiGet<RoutineVersion>(
            `/api/fitness/routine/versions/${versionsData.activeVersion.id}`
          )
          if (activeResponse.success && activeResponse.data) {
            setCurrentVersion(activeResponse.data)
            if (activeResponse.data.id === 'json-fallback') {
              setDraftVersion(activeResponse.data)
            } else {
              setDraftVersion(null)
            }
          }
        } else if (!isCreatingVersion.current) {
          isCreatingVersion.current = true
          try {
            const newVersionResponse = await apiPost<RoutineVersion>(
              '/api/fitness/routine/versions',
              {
                routineId,
                name: 'Initial Version',
                changeSummary: 'Initial version from existing routine',
              }
            )
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
    },
    [routineId, toast]
  )

  useEffect(() => {
    if (!hasLoadedOnce.current) {
      loadData()
    }
  }, [loadData])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  const ensureDraft = useCallback(async (): Promise<RoutineVersion | null> => {
    if (draftVersion) return draftVersion

    if (currentVersion?.id === 'json-fallback') {
      setDraftVersion(currentVersion)
      return currentVersion
    }

    try {
      const response = await apiPost<RoutineVersion>(
        '/api/fitness/routine/versions',
        {
          routineId,
          changeSummary: 'Draft changes',
        }
      )
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

  const saveChanges = useCallback(
    async (updates: Partial<RoutineVersion>) => {
      const draft = await ensureDraft()
      if (!draft) return

      setSaveStatus('saving')
      try {
        const response = await apiPut<RoutineVersion>(
          `/api/fitness/routine/versions/${draft.id}`,
          updates
        )
        if (response.success && response.data) {
          setDraftVersion(response.data)
          setCurrentVersion(response.data)
          setIsDirty(false)
          setLastSaved(new Date().toISOString())
          setSaveStatus('saved')
        } else {
          throw new Error('Failed to save')
        }
      } catch (error) {
        setSaveStatus('error')
        toast({
          title: 'Error saving',
          description: 'Failed to save changes. Please try again.',
          variant: 'destructive',
        })
      }
    },
    [ensureDraft, toast]
  )

  const publishVersion = useCallback(async () => {
    if (!draftVersion) return

    setSaveStatus('saving')
    try {
      const response = await apiPost<RoutineVersion>(
        `/api/fitness/routine/versions/${draftVersion.id}/activate`,
        {}
      )
      if (response.success && response.data) {
        const publishedVersion = {
          ...response.data,
          isActive: true,
          isDraft: false,
        }
        setCurrentVersion(publishedVersion)
        setDraftVersion(null)
        setIsDirty(false)
        setSaveStatus('saved')
        setLastSaved(new Date().toISOString())

        const versionsResponse = await apiGet<VersionsListResponse>(
          `/api/fitness/routine/versions?routineId=${routineId}`
        )
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
      setSaveStatus('error')
      toast({
        title: 'Error publishing',
        description: 'Failed to publish changes. Please try again.',
        variant: 'destructive',
      })
    }
  }, [draftVersion, routineId, toast])

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      const version = currentVersionRef.current
      if (version) {
        saveChanges(version)
      }
    }, 3000)
  }, [saveChanges])

  const handleUpdate = useCallback(
    (field: string, value: unknown) => {
      setCurrentVersion(prev => {
        if (!prev) return prev
        return { ...prev, [field]: value }
      })
      setIsDirty(true)
      setSaveStatus('idle')
      scheduleAutosave()
    },
    [scheduleAutosave]
  )

  const handleAiApply = useCallback(
    (
      updatedDefs: Record<DayOfWeek, Workout>,
      commitMessage: string,
      diff: RoutineChangeDiffEntry[]
    ) => {
      if (!currentVersion) return

      setUndoStack(prev => {
        const snapshot = {
          workoutDefinitions: structuredClone(
            currentVersion.workoutDefinitions
          ),
          commitMessage,
          timestamp: Date.now(),
        }
        const next = [...prev, snapshot]
        return next.length > 10 ? next.slice(-10) : next
      })

      handleUpdate('workoutDefinitions', updatedDefs)

      const firstChanged = diff[0]
      if (firstChanged) {
        const day = firstChanged.day as DayOfWeek
        if (DAYS.includes(day)) {
          setSelectedDay(day)
          setActiveSection('workout')
        }
      }

      toast({
        title: 'AI changes applied',
        description: commitMessage,
        action: (
          <ToastAction
            altText="Undo AI changes"
            onClick={() => {
              setUndoStack(prev => {
                if (prev.length === 0) return prev
                const next = [...prev]
                const entry = next.pop()!
                handleUpdate('workoutDefinitions', entry.workoutDefinitions)
                return next
              })
              toast({ title: 'Undo successful', description: 'Reverted to previous state.' })
            }}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </ToastAction>
        ),
      })
    },
    [currentVersion, handleUpdate, toast]
  )

  const handleAiUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const entry = next.pop()!
      handleUpdate('workoutDefinitions', entry.workoutDefinitions)
      toast({
        title: 'Undo successful',
        description: `Reverted: ${entry.commitMessage}`,
      })
      return next
    })
  }, [handleUpdate, toast])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-60 border-r p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Separator />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // No data state
  if (!currentVersion) {
    return (
      <Card className="m-8">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-lg">No routine found</p>
          <Button onClick={() => loadData(true)} className="mt-4" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
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

  const navigateToDay = (day: DayOfWeek) => {
    setSelectedDay(day)
    setActiveSection('workout')
  }

  // Content heading for the main panel
  const sectionTitle = (() => {
    switch (activeSection) {
      case 'overview':
        return 'Overview'
      case 'schedule':
        return 'Weekly Schedule'
      case 'workout':
        return `${DAY_LABELS[selectedDay]} Workout`
      case 'daily-routines':
        return 'Daily Routines'
      case 'versions':
        return 'Version History'
    }
  })()

  return (
    <div className="flex h-full flex-col">
      {/* Top Header Bar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-14 shrink-0 items-center justify-between border-b px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isDirty) {
                  setShowBackDialog(true)
                } else {
                  onBack()
                }
              }}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">{currentVersion.name}</h1>
            {!isLocalMode && (
              <Badge variant="outline" className="font-mono text-xs">
                v{currentVersion.versionNumber}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Save Status */}
          {saveStatus === 'saving' && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saveStatus === 'saved' && lastSaved && (
            <span className="flex items-center gap-1.5 text-sm text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved {new Date(lastSaved).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              Failed
            </span>
          )}
          {hasUnsavedChanges && saveStatus !== 'saving' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveChanges(currentVersion)}
            >
              <Save className="mr-2 h-4 w-4" />
              {isLocalMode ? 'Save' : 'Save Draft'}
            </Button>
          )}
          {isEditingDraft && (
            <Button
              size="sm"
              onClick={publishVersion}
              disabled={saveStatus === 'saving' || hasUnsavedChanges}
              title={
                hasUnsavedChanges
                  ? 'Save your changes first'
                  : 'Make this version active'
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}
          {!isLocalMode && !isEditingDraft && currentVersion.isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const draft = await ensureDraft()
                if (draft) {
                  toast({
                    title: 'Draft created',
                    description: 'You can now edit and publish when ready.',
                  })
                }
              }}
              disabled={saveStatus === 'saving'}
            >
              New Version
            </Button>
          )}
          <Button
            variant={aiCoachOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAiCoachOpen(v => !v)}
            className={cn(
              'hidden gap-1.5 lg:inline-flex',
              aiCoachOpen && 'bg-purple-600 text-white hover:bg-purple-700'
            )}
          >
            <Brain className="h-3.5 w-3.5" />
            AI Coach
          </Button>
        </div>
      </div>

      {/* Version Status Banner */}
      {isLocalMode && (
        <div className="flex items-center gap-2 border-b bg-blue-500/10 px-5 py-1.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="font-medium text-blue-400">Local Mode</span>
          <span className="text-muted-foreground">— Changes saved to local JSON file. Connect Supabase for versioning.</span>
        </div>
      )}
      {isEditingDraft && (
        <div className="flex items-center gap-2 border-b bg-amber-500/10 px-5 py-1.5 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <span className="font-medium text-amber-400">Draft v{currentVersion.versionNumber}</span>
          <span className="text-muted-foreground">— Editing draft. Publish when ready to make it the active routine.</span>
          {activeVersion && (
            <span className="text-muted-foreground ml-auto text-xs">
              Active: v{activeVersion.versionNumber}
            </span>
          )}
        </div>
      )}
      {!isLocalMode && !isEditingDraft && currentVersion.isActive && (
        <div className="flex items-center gap-2 border-b bg-green-500/10 px-5 py-1.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-medium text-green-400">Active v{currentVersion.versionNumber}</span>
          <span className="text-muted-foreground">— This is the live routine. Create a new version to make changes.</span>
        </div>
      )}

      {/* Sidebar + Content + AI Coach */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <nav className="bg-muted/30 flex w-56 shrink-0 flex-col border-r">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {/* Overview group */}
              <p className="text-muted-foreground px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider">
                General
              </p>
              <SidebarItem
                icon={<User className="h-4 w-4" />}
                label="Overview"
                active={activeSection === 'overview'}
                onClick={() => setActiveSection('overview')}
              />
              <SidebarItem
                icon={<Calendar className="h-4 w-4" />}
                label="Schedule"
                active={activeSection === 'schedule'}
                onClick={() => setActiveSection('schedule')}
              />
              <SidebarItem
                icon={<History className="h-4 w-4" />}
                label="History"
                active={activeSection === 'versions'}
                onClick={() => setActiveSection('versions')}
                badge={
                  versions && versions.versions.length > 1
                    ? versions.versions.length
                    : undefined
                }
              />
              <SidebarItem
                icon={<Sun className="h-4 w-4" />}
                label="Daily Routines"
                active={activeSection === 'daily-routines'}
                onClick={() => setActiveSection('daily-routines')}
              />

              <Separator className="my-2" />

              {/* Workouts group */}
              <p className="text-muted-foreground px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider">
                Workouts
              </p>
              {DAYS.map(day => {
                const focus = currentVersion.schedule?.[day]?.focus ?? ''
                const workout = currentVersion.workoutDefinitions?.[day]
                const hasWorkout = !!workout
                const isActive =
                  activeSection === 'workout' && selectedDay === day
                return (
                  <button
                    key={day}
                    onClick={() => navigateToDay(day)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        hasWorkout ? getFocusDot(focus) : 'bg-muted-foreground/30'
                      )}
                    />
                    <span className="flex-1">{DAY_SHORT[day]}</span>
                    {focus && (
                      <span className="text-muted-foreground/60 truncate text-[11px]">
                        {focus}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          {/* Sidebar footer: version status */}
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              {isLocalMode ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground text-xs">Local mode</span>
                </>
              ) : isEditingDraft ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  <span className="text-xs">
                    Draft v{currentVersion.versionNumber}
                  </span>
                </>
              ) : currentVersion.isActive ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">
                    Active v{currentVersion.versionNumber}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className={cn(
            "mx-auto p-6 lg:p-8",
            activeSection === 'overview' || activeSection === 'daily-routines' ? 'max-w-5xl' : 'max-w-4xl'
          )}>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">
              {sectionTitle}
            </h2>

            {activeSection === 'overview' && (
              <div className="grid gap-5 lg:grid-cols-2">
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
                  onUpdate={protocol =>
                    handleUpdate('injuryProtocol', protocol)
                  }
                />
              </div>
            )}

            {activeSection === 'schedule' && (
              <ScheduleEditor
                schedule={currentVersion.schedule}
                onUpdate={schedule => handleUpdate('schedule', schedule)}
              />
            )}

            {activeSection === 'workout' && (
              <WorkoutDayEditor
                workoutDefinitions={currentVersion.workoutDefinitions}
                schedule={currentVersion.schedule}
                selectedDay={selectedDay}
                onSelectDay={navigateToDay}
                onUpdate={definitions =>
                  handleUpdate('workoutDefinitions', definitions)
                }
              />
            )}

            {activeSection === 'daily-routines' && (
              <DailyRoutineEditor
                dailyRoutines={currentVersion.dailyRoutines}
                onUpdate={routines => handleUpdate('dailyRoutines', routines)}
              />
            )}

            {activeSection === 'versions' && (
              <VersionHistory
                routineId={routineId}
                currentVersionId={currentVersion.id}
                versions={versions}
                onVersionSelect={async versionId => {
                  const response = await apiGet<RoutineVersion>(
                    `/api/fitness/routine/versions/${versionId}`
                  )
                  if (response.success && response.data) {
                    setCurrentVersion(response.data)
                  }
                }}
                onRestore={async versionId => {
                  const response = await apiPost<RoutineVersion>(
                    '/api/fitness/routine/versions',
                    {
                      routineId,
                      basedOnVersionId: versionId,
                      changeSummary: 'Restored from previous version',
                    }
                  )
                  if (response.success && response.data) {
                    setDraftVersion(response.data)
                    setCurrentVersion(response.data)
                    await loadData(true)
                  }
                }}
                onRefresh={() => loadData(true)}
              />
            )}
          </div>
        </main>

        {/* AI Coach Inline Panel */}
        <AiCoachInline
          open={aiCoachOpen}
          onClose={() => setAiCoachOpen(false)}
          onApplyChanges={handleAiApply}
          currentWorkoutDefs={currentVersion.workoutDefinitions}
          undoAvailable={undoStack.length > 0}
          onUndo={handleAiUndo}
        />
      </div>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your
              changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowBackDialog(false)
                onBack?.()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
          {badge}
        </Badge>
      )}
    </button>
  )
}
