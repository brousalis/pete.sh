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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type {
  DayOfWeek,
  Exercise,
  WeeklySchedule,
  Workout,
  WorkoutFocus,
} from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Flame,
  Minus,
  Plus,
  Shield,
  StretchHorizontal,
  Target,
  Trash2,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useEffect, useState } from 'react'
import { ExerciseEditor } from './exercise-editor'
import { ExerciseVideoManager } from './exercise-video-manager'

interface WorkoutDayEditorProps {
  workoutDefinitions?: Record<DayOfWeek, Workout>
  schedule?: WeeklySchedule
  selectedDay: DayOfWeek
  onSelectDay: (day: DayOfWeek) => void
  onUpdate: (definitions: Record<DayOfWeek, Workout>) => void
}

const FOCUS_OPTIONS: { value: WorkoutFocus; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'conditioning', label: 'Conditioning' },
]

const REST_PRESETS = [
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
]

type SectionType =
  | 'warmup'
  | 'exercises'
  | 'finisher'
  | 'metabolicFlush'
  | 'mobility'

interface SectionConfig {
  key: SectionType
  label: string
  icon: React.ReactNode
  accentColor: string
  badgeClass: string
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'warmup',
    label: 'Warm-up',
    icon: <Flame className="h-4 w-4 text-orange-400" />,
    accentColor: 'text-orange-400',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  },
  {
    key: 'exercises',
    label: 'Main Workout',
    icon: <Dumbbell className="h-4 w-4 text-blue-400" />,
    accentColor: 'text-blue-400',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  {
    key: 'finisher',
    label: 'Finisher',
    icon: <Zap className="h-4 w-4 text-purple-400" />,
    accentColor: 'text-purple-400',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  },
  {
    key: 'metabolicFlush',
    label: 'Metabolic Flush',
    icon: <Wind className="h-4 w-4 text-green-400" />,
    accentColor: 'text-green-400',
    badgeClass: 'bg-green-500/15 text-green-400 border-green-500/20',
  },
  {
    key: 'mobility',
    label: 'Mobility',
    icon: <StretchHorizontal className="h-4 w-4 text-cyan-400" />,
    accentColor: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  },
]

function generateExerciseId(
  day: DayOfWeek,
  section: SectionType,
  index: number
): string {
  const prefix = day.slice(0, 3)
  const sectionPrefix =
    section === 'warmup'
      ? 'w'
      : section === 'exercises'
        ? ''
        : section.slice(0, 3)
  return `${prefix}-${sectionPrefix}${index + 1}`.replace('--', '-')
}

function estimateSectionDuration(exercises: Exercise[]): string {
  let totalSeconds = 0
  for (const ex of exercises) {
    if (ex.duration) {
      totalSeconds += ex.duration
    } else if (ex.sets && ex.reps) {
      totalSeconds += ex.sets * ex.reps * 3 + (ex.rest || 60) * (ex.sets - 1)
    }
  }
  if (totalSeconds <= 0) return ''
  const mins = Math.round(totalSeconds / 60)
  return mins > 0 ? `~${mins}m` : ''
}

interface SelectedExercise {
  section: SectionType
  index: number
}

function DroppableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={isOver ? 'rounded-xl ring-2 ring-primary/30 transition-shadow' : 'transition-shadow'}
    >
      {children}
    </div>
  )
}

export function WorkoutDayEditor({
  workoutDefinitions,
  schedule,
  selectedDay,
  onSelectDay,
  onUpdate,
}: WorkoutDayEditorProps) {
  const [expandedSections, setExpandedSections] = useState<SectionType[]>([
    'exercises',
  ])
  const [selectedExercise, setSelectedExercise] = useState<SelectedExercise | null>(null)
  const [removingSectionKey, setRemovingSectionKey] = useState<SectionType | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!workoutDefinitions || !schedule) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">Loading workout data...</p>
        </CardContent>
      </Card>
    )
  }

  const workout = workoutDefinitions[selectedDay]
  const daySchedule = schedule[selectedDay]

  const toggleSection = (section: SectionType) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const updateWorkout = (updates: Partial<Workout>) => {
    onUpdate({
      ...workoutDefinitions,
      [selectedDay]: { ...workout, ...updates },
    })
  }

  const getExercisesForSection = useCallback((section: SectionType): Exercise[] => {
    if (!workout) return []

    switch (section) {
      case 'warmup':
        return workout.warmup?.exercises ?? []
      case 'exercises':
        return workout.exercises ?? []
      case 'finisher':
        return workout.finisher ?? []
      case 'metabolicFlush':
        return workout.metabolicFlush?.exercises ?? []
      case 'mobility':
        return workout.mobility?.exercises ?? []
      default:
        return []
    }
  }, [workout])

  const updateExercisesForSection = (
    section: SectionType,
    exercises: Exercise[]
  ) => {
    switch (section) {
      case 'warmup':
        updateWorkout({
          warmup: workout?.warmup
            ? { ...workout.warmup, exercises }
            : { name: 'Warm-up', exercises },
        })
        break
      case 'exercises':
        updateWorkout({ exercises })
        break
      case 'finisher':
        updateWorkout({
          finisher: exercises.length > 0 ? exercises : undefined,
        })
        break
      case 'metabolicFlush':
        updateWorkout({
          metabolicFlush:
            exercises.length > 0
              ? workout?.metabolicFlush
                ? { ...workout.metabolicFlush, exercises }
                : { name: 'Metabolic Flush', exercises }
              : undefined,
        })
        break
      case 'mobility':
        updateWorkout({
          mobility:
            exercises.length > 0
              ? workout?.mobility
                ? { ...workout.mobility, exercises }
                : { name: 'Mobility', exercises }
              : undefined,
        })
        break
    }
  }

  const addExercise = (section: SectionType) => {
    const exercises = getExercisesForSection(section)
    const newExercise: Exercise = {
      id: generateExerciseId(selectedDay, section, exercises.length),
      name: 'New Exercise',
      sets: 3,
      reps: 10,
    }
    updateExercisesForSection(section, [...exercises, newExercise])
    setSelectedExercise({ section, index: exercises.length })
    if (!expandedSections.includes(section)) {
      setExpandedSections(prev => [...prev, section])
    }
  }

  const updateExercise = (
    section: SectionType,
    index: number,
    exercise: Exercise
  ) => {
    const exercises = [...getExercisesForSection(section)]
    exercises[index] = exercise
    updateExercisesForSection(section, exercises)
  }

  const deleteExercise = (section: SectionType, index: number) => {
    const exercises = getExercisesForSection(section).filter(
      (_, i) => i !== index
    )
    updateExercisesForSection(section, exercises)
    if (selectedExercise?.section === section && selectedExercise?.index === index) {
      setSelectedExercise(null)
    } else if (selectedExercise?.section === section && selectedExercise.index > index) {
      setSelectedExercise({ section, index: selectedExercise.index - 1 })
    }
  }

  const duplicateExercise = (section: SectionType, index: number) => {
    const exercises = [...getExercisesForSection(section)]
    const original = exercises[index]
    if (!original) return
    const duplicate: Exercise = {
      ...original,
      id: generateExerciseId(selectedDay, section, exercises.length),
      name: `${original.name} (copy)`,
    }
    exercises.splice(index + 1, 0, duplicate)
    updateExercisesForSection(section, exercises)
    setSelectedExercise({ section, index: index + 1 })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeParts = activeId.split('::')
    if (activeParts.length !== 2) return
    const sourceSection = activeParts[0] as SectionType
    const sourceIndex = Number(activeParts[1])
    if (isNaN(sourceIndex)) return

    let targetSection: SectionType
    let targetIndex: number

    if (overId.startsWith('drop::')) {
      targetSection = overId.replace('drop::', '') as SectionType
      targetIndex = getExercisesForSection(targetSection).length
    } else if (overId.includes('::')) {
      const overParts = overId.split('::')
      targetSection = overParts[0] as SectionType
      targetIndex = Number(overParts[1])
      if (isNaN(targetIndex)) return
    } else {
      return
    }

    if (sourceSection === targetSection) {
      const exercises = [...getExercisesForSection(sourceSection)]
      const moved = exercises.splice(sourceIndex, 1)[0]
      if (!moved) return
      exercises.splice(targetIndex, 0, moved)
      updateExercisesForSection(sourceSection, exercises)

      if (selectedExercise?.section === sourceSection) {
        if (selectedExercise.index === sourceIndex) {
          setSelectedExercise({ section: sourceSection, index: targetIndex })
        } else if (selectedExercise.index > sourceIndex && selectedExercise.index <= targetIndex) {
          setSelectedExercise({ section: sourceSection, index: selectedExercise.index - 1 })
        } else if (selectedExercise.index < sourceIndex && selectedExercise.index >= targetIndex) {
          setSelectedExercise({ section: sourceSection, index: selectedExercise.index + 1 })
        }
      }
    } else {
      moveExerciseBetweenSections(sourceSection, sourceIndex, targetSection, targetIndex)
    }
  }

  const setSectionExercises = (
    updates: Partial<Workout>,
    section: SectionType,
    exercises: Exercise[]
  ) => {
    switch (section) {
      case 'warmup':
        updates.warmup = exercises.length > 0
          ? { ...workout?.warmup, name: workout?.warmup?.name ?? 'Warm-up', exercises }
          : undefined
        break
      case 'exercises':
        updates.exercises = exercises
        break
      case 'finisher':
        updates.finisher = exercises.length > 0 ? exercises : undefined
        break
      case 'metabolicFlush':
        updates.metabolicFlush = exercises.length > 0
          ? { ...workout?.metabolicFlush, name: workout?.metabolicFlush?.name ?? 'Metabolic Flush', exercises }
          : undefined
        break
      case 'mobility':
        updates.mobility = exercises.length > 0
          ? { ...workout?.mobility, name: workout?.mobility?.name ?? 'Mobility', exercises }
          : undefined
        break
    }
  }

  const moveExerciseBetweenSections = (
    fromSection: SectionType,
    fromIndex: number,
    toSection: SectionType,
    toIndex: number
  ) => {
    const sourceExercises = [...getExercisesForSection(fromSection)]
    const exercise = sourceExercises[fromIndex]
    if (!exercise) return

    sourceExercises.splice(fromIndex, 1)

    const targetExercises = [...getExercisesForSection(toSection)]
    const insertAt = Math.min(toIndex, targetExercises.length)
    const movedExercise: Exercise = {
      ...exercise,
      id: generateExerciseId(selectedDay, toSection, targetExercises.length),
    }
    targetExercises.splice(insertAt, 0, movedExercise)

    const updates: Partial<Workout> = {}
    setSectionExercises(updates, fromSection, sourceExercises)
    setSectionExercises(updates, toSection, targetExercises)
    updateWorkout(updates)

    if (!expandedSections.includes(toSection)) {
      setExpandedSections(prev => [...prev, toSection])
    }

    if (selectedExercise?.section === fromSection && selectedExercise?.index === fromIndex) {
      setSelectedExercise({ section: toSection, index: insertAt })
    } else {
      setSelectedExercise(null)
    }
  }

  const removeSection = (section: SectionType) => {
    if (section === 'exercises') return
    const updates: Partial<Workout> = {}
    switch (section) {
      case 'warmup':
        updates.warmup = undefined
        break
      case 'finisher':
        updates.finisher = undefined
        break
      case 'metabolicFlush':
        updates.metabolicFlush = undefined
        break
      case 'mobility':
        updates.mobility = undefined
        break
    }
    updateWorkout(updates)
    if (selectedExercise?.section === section) {
      setSelectedExercise(null)
    }
    setRemovingSectionKey(null)
  }

  const currentExercise = selectedExercise
    ? getExercisesForSection(selectedExercise.section)[selectedExercise.index]
    : null

  const activeDragExercise = (() => {
    if (!activeDragId) return null
    const parts = activeDragId.split('::')
    if (parts.length !== 2) return null
    return getExercisesForSection(parts[0] as SectionType)[Number(parts[1])] ?? null
  })()

  const handleExerciseFieldChange = <K extends keyof Exercise>(field: K, value: Exercise[K]) => {
    if (!selectedExercise || !currentExercise) return
    updateExercise(selectedExercise.section, selectedExercise.index, {
      ...currentExercise,
      [field]: value,
    })
  }

  const navigateExercise = (direction: 'prev' | 'next') => {
    if (!selectedExercise) return
    const exercises = getExercisesForSection(selectedExercise.section)
    const newIndex = direction === 'prev'
      ? selectedExercise.index - 1
      : selectedExercise.index + 1
    if (newIndex >= 0 && newIndex < exercises.length) {
      setSelectedExercise({ ...selectedExercise, index: newIndex })
    }
  }

  useEffect(() => {
    if (!selectedExercise) return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateExercise('prev') }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateExercise('next') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-muted/50 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <Target className="text-muted-foreground h-10 w-10" />
        </div>
        <p className="text-muted-foreground mb-1 text-lg font-medium">
          No workout for this day
        </p>
        <p className="text-muted-foreground mb-6 text-sm">
          {daySchedule?.focus && `${daySchedule.focus}: `}
          {daySchedule?.goal || 'Create a workout to get started'}
        </p>
        <Button
          size="lg"
          onClick={() => {
            const newWorkout: Workout = {
              id: `${selectedDay}-workout`,
              name: `${daySchedule?.focus || 'Workout'}`,
              focus: 'strength',
              day: selectedDay,
              goal: daySchedule?.goal,
              exercises: [],
            }
            onUpdate({
              ...workoutDefinitions,
              [selectedDay]: newWorkout,
            })
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workout
        </Button>
      </div>
    )
  }

  const totalExercises = SECTIONS.reduce(
    (sum, s) => sum + getExercisesForSection(s.key).length,
    0
  )

  const formatDuration = (seconds?: number) => {
    if (seconds == null || isNaN(seconds) || seconds <= 0) return ''
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${seconds}s`
  }

  return (
    <>
    <div className="space-y-5">
      {/* Workout Header */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Name</Label>
          <Input
            value={workout.name}
            onChange={e => updateWorkout({ name: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Focus</Label>
          <Select
            value={workout.focus}
            onValueChange={(value: WorkoutFocus) =>
              updateWorkout({ focus: value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOCUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Goal</Label>
          <Input
            value={workout.goal ?? ''}
            onChange={e => updateWorkout({ goal: e.target.value })}
            placeholder="Workout goal..."
            className="h-9"
          />
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-xs py-0.5 px-2">
          {totalExercises} exercises
        </Badge>
        {SECTIONS.map(s => {
          const count = getExercisesForSection(s.key).length
          if (count === 0) return null
          const dur = estimateSectionDuration(getExercisesForSection(s.key))
          return (
            <span key={s.key} className="text-muted-foreground text-xs">
              {s.label}: {count}{dur ? ` (${dur})` : ''}
            </span>
          )
        })}
      </div>

      {/* Sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {SECTIONS.map(section => {
            const exercises = getExercisesForSection(section.key)
            const isExpanded = expandedSections.includes(section.key)
            const hasExercises = exercises.length > 0
            const sectionData =
              section.key === 'warmup'
                ? workout.warmup
                : section.key === 'metabolicFlush'
                  ? workout.metabolicFlush
                  : section.key === 'mobility'
                    ? workout.mobility
                    : null

            if (
              !hasExercises &&
              section.key !== 'exercises' &&
              section.key !== 'warmup'
            ) {
              return (
                <DroppableSection key={section.key} id={`drop::${section.key}`}>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground w-full justify-start border border-dashed py-5"
                    onClick={() => addExercise(section.key)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add {section.label} Section
                  </Button>
                </DroppableSection>
              )
            }

            const durationEstimate = estimateSectionDuration(exercises)

            return (
              <DroppableSection key={section.key} id={`drop::${section.key}`}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.key)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="group/section hover:bg-accent/30 cursor-pointer py-3 px-4 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {section.icon}
                            <CardTitle className="text-base font-semibold">
                              {sectionData?.name || section.label}
                            </CardTitle>
                            <Badge variant="outline" className={`text-[11px] h-5 px-1.5 font-medium border ${section.badgeClass}`}>
                              {exercises.length}
                            </Badge>
                            {durationEstimate && (
                              <span className="text-muted-foreground text-xs">
                                {durationEstimate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {section.key !== 'exercises' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/section:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (exercises.length > 0) {
                                    setRemovingSectionKey(section.key)
                                  } else {
                                    removeSection(section.key)
                                  }
                                }}
                                title={`Remove ${section.label}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <ChevronRight className="text-muted-foreground h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-2 pt-0 px-4 pb-4">
                        {/* Section Settings */}
                        {(section.key === 'warmup' ||
                          section.key === 'metabolicFlush' ||
                          section.key === 'mobility') && (
                          <div className="bg-muted/40 flex gap-3 rounded-lg p-3 mb-1">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs font-medium">Section Name</Label>
                              <Input
                                value={sectionData?.name ?? section.label}
                                onChange={e => {
                                  if (section.key === 'warmup') {
                                    updateWorkout({
                                      warmup: {
                                        ...workout.warmup,
                                        name: e.target.value,
                                        exercises: workout.warmup?.exercises ?? [],
                                      },
                                    })
                                  } else if (section.key === 'metabolicFlush') {
                                    updateWorkout({
                                      metabolicFlush: {
                                        ...workout.metabolicFlush,
                                        name: e.target.value,
                                        exercises:
                                          workout.metabolicFlush?.exercises ?? [],
                                      },
                                    })
                                  } else if (section.key === 'mobility') {
                                    updateWorkout({
                                      mobility: {
                                        ...workout.mobility,
                                        name: e.target.value,
                                        exercises:
                                          workout.mobility?.exercises ?? [],
                                      },
                                    })
                                  }
                                }}
                                className="bg-background h-8"
                              />
                            </div>
                            <div className="w-28 space-y-1">
                              <Label className="text-xs font-medium">Duration</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={sectionData?.duration ?? ''}
                                  onChange={e => {
                                    const duration = e.target.value
                                      ? Number(e.target.value)
                                      : undefined
                                    if (section.key === 'warmup') {
                                      updateWorkout({
                                        warmup: {
                                          ...workout.warmup,
                                          name: workout.warmup?.name ?? 'Warm-up',
                                          duration,
                                          exercises: workout.warmup?.exercises ?? [],
                                        },
                                      })
                                    } else if (section.key === 'metabolicFlush') {
                                      updateWorkout({
                                        metabolicFlush: {
                                          ...workout.metabolicFlush,
                                          name:
                                            workout.metabolicFlush?.name ??
                                            'Metabolic Flush',
                                          duration,
                                          exercises:
                                            workout.metabolicFlush?.exercises ?? [],
                                        },
                                      })
                                    } else if (section.key === 'mobility') {
                                      updateWorkout({
                                        mobility: {
                                          ...workout.mobility,
                                          name: workout.mobility?.name ?? 'Mobility',
                                          duration,
                                          exercises:
                                            workout.mobility?.exercises ?? [],
                                        },
                                      })
                                    }
                                  }}
                                  className="bg-background h-8 pr-10"
                                />
                                <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                                  min
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Exercise List */}
                        <SortableContext
                          items={exercises.map((_, i) => `${section.key}::${i}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1">
                            {exercises.map((exercise, index) => (
                              <ExerciseEditor
                                key={exercise.id || index}
                                exercise={exercise}
                                index={index}
                                sortId={`${section.key}::${index}`}
                                isSelected={
                                  selectedExercise?.section === section.key &&
                                  selectedExercise?.index === index
                                }
                                onSelect={() =>
                                  setSelectedExercise({ section: section.key, index })
                                }
                                onDelete={() => deleteExercise(section.key, index)}
                                onDuplicate={() =>
                                  duplicateExercise(section.key, index)
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground hover:text-foreground border border-dashed h-8 text-xs"
                          onClick={() => addExercise(section.key)}
                        >
                          <Plus className="mr-1.5 h-3 w-3" />
                          Add Exercise
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </DroppableSection>
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragExercise && (
            <div className="bg-card border rounded-md px-3 py-2.5 shadow-xl flex items-center gap-2 text-sm w-[400px]">
              <span className="font-medium truncate">{activeDragExercise.name}</span>
              {activeDragExercise.sets && activeDragExercise.reps && (
                <span className="text-muted-foreground ml-auto text-xs shrink-0">
                  {activeDragExercise.sets}&times;{activeDragExercise.reps}
                </span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>

    {/* Exercise Detail Modal */}
    <Dialog
      open={!!selectedExercise && !!currentExercise}
      onOpenChange={(open) => {
        if (!open) setSelectedExercise(null)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl p-0 gap-0 flex flex-col max-h-[85vh]"
      >
        {currentExercise && selectedExercise && (() => {
          const sectionConfig = SECTIONS.find(s => s.key === selectedExercise.section)
          const sectionExercises = getExercisesForSection(selectedExercise.section)
          return (
          <>
            <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Badge variant="outline" className="text-xs font-mono shrink-0 h-6 w-8 justify-center">
                    {currentExercise.id?.split('-').pop()?.toUpperCase() || selectedExercise.index + 1}
                  </Badge>
                  <DialogTitle className="text-base truncate">
                    {currentExercise.name}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={selectedExercise.index === 0}
                    onClick={() => navigateExercise('prev')}
                    title="Previous exercise (←)"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={
                      selectedExercise.index >=
                      sectionExercises.length - 1
                    }
                    onClick={() => navigateExercise('next')}
                    title="Next exercise (→)"
                  >
                    Next
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedExercise(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {sectionConfig && (
                  <span className="flex items-center gap-1">
                    {sectionConfig.icon}
                    {sectionConfig.label}
                  </span>
                )}
                <span>·</span>
                <span>{selectedExercise.index + 1} of {sectionExercises.length}</span>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Exercise Name + Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Exercise Name</Label>
                    <Input
                      value={currentExercise.name}
                      onChange={(e) => handleExerciseFieldChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Section</Label>
                    <Select
                      value={selectedExercise.section}
                      onValueChange={(value) => {
                        const targetSection = value as SectionType
                        if (targetSection === selectedExercise.section) return
                        const targetExercises = getExercisesForSection(targetSection)
                        moveExerciseBetweenSections(
                          selectedExercise.section,
                          selectedExercise.index,
                          targetSection,
                          targetExercises.length
                        )
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(s => (
                          <SelectItem key={s.key} value={s.key}>
                            <span className="flex items-center gap-2">
                              {s.icon}
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Programming */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Programming</p>

                  {/* At-a-glance prescription */}
                  {(currentExercise.sets || currentExercise.reps || currentExercise.duration) && (
                    <div className="bg-muted/50 rounded-lg px-4 py-2.5 flex items-baseline justify-center gap-2.5 font-mono">
                      {currentExercise.sets && currentExercise.reps ? (
                        <span className="text-xl font-bold tracking-tight">
                          {currentExercise.sets}<span className="text-muted-foreground mx-0.5">&times;</span>{currentExercise.reps}
                        </span>
                      ) : currentExercise.sets ? (
                        <span className="text-xl font-bold tracking-tight">
                          {currentExercise.sets} <span className="text-sm font-normal text-muted-foreground">sets</span>
                        </span>
                      ) : null}
                      {currentExercise.weight != null && currentExercise.weight > 0 && (
                        <>
                          <span className="text-muted-foreground/50 text-lg">@</span>
                          <span className="text-lg font-bold tracking-tight">
                            {currentExercise.weight}<span className="text-sm font-normal text-muted-foreground ml-0.5">lbs</span>
                          </span>
                        </>
                      )}
                      {currentExercise.duration != null && currentExercise.duration > 0 && (
                        <>
                          {(currentExercise.sets || currentExercise.reps) && (
                            <span className="text-muted-foreground/50 text-lg">/</span>
                          )}
                          <span className={cn(
                            'font-bold tracking-tight',
                            currentExercise.sets || currentExercise.reps ? 'text-base text-muted-foreground' : 'text-xl'
                          )}>
                            {formatDuration(currentExercise.duration)}
                          </span>
                        </>
                      )}
                      {currentExercise.rest != null && currentExercise.rest > 0 && (
                        <>
                          <span className="text-muted-foreground/40 text-sm">·</span>
                          <span className="text-sm text-muted-foreground font-medium">
                            {formatDuration(currentExercise.rest)} rest
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Sets & Reps with steppers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sets</Label>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          disabled={!currentExercise.sets || currentExercise.sets <= 1}
                          onClick={() => handleExerciseFieldChange('sets', (currentExercise.sets ?? 1) - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          type="number"
                          value={currentExercise.sets ?? ''}
                          onChange={(e) => handleExerciseFieldChange('sets', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="3"
                          className="h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => handleExerciseFieldChange('sets', (currentExercise.sets ?? 0) + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Reps</Label>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          disabled={!currentExercise.reps || currentExercise.reps <= 1}
                          onClick={() => handleExerciseFieldChange('reps', (currentExercise.reps ?? 1) - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          type="number"
                          value={currentExercise.reps ?? ''}
                          onChange={(e) => handleExerciseFieldChange('reps', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="10"
                          className="h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => handleExerciseFieldChange('reps', (currentExercise.reps ?? 0) + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Target Weight</Label>
                    <div className="relative w-32">
                      <Input
                        type="number"
                        value={currentExercise.weight ?? ''}
                        onChange={(e) => handleExerciseFieldChange('weight', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="—"
                        className="h-9 pr-10"
                      />
                      <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">lbs</span>
                    </div>
                  </div>

                  {/* Duration as min + sec */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Duration per Set</Label>
                    <div className="grid grid-cols-2 gap-2 max-w-[16rem]">
                      <div className="relative">
                        <Input
                          type="number"
                          value={currentExercise.duration ? Math.floor(currentExercise.duration / 60) || '' : ''}
                          onChange={(e) => {
                            const min = e.target.value ? Number(e.target.value) : 0
                            const sec = (currentExercise.duration ?? 0) % 60
                            const total = min * 60 + sec
                            handleExerciseFieldChange('duration', total > 0 ? total : undefined)
                          }}
                          placeholder="0"
                          className="h-9 pr-10"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">min</span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={currentExercise.duration ? (currentExercise.duration % 60) || '' : ''}
                          onChange={(e) => {
                            const sec = e.target.value ? Math.min(Number(e.target.value), 59) : 0
                            const min = Math.floor((currentExercise.duration ?? 0) / 60)
                            const total = min * 60 + sec
                            handleExerciseFieldChange('duration', total > 0 ? total : undefined)
                          }}
                          placeholder="0"
                          className="h-9 pr-10"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">sec</span>
                      </div>
                    </div>
                  </div>

                  {/* Rest with quick-select pills */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Rest Between Sets</Label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {REST_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer',
                            currentExercise.rest === preset.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                          )}
                          onClick={() => handleExerciseFieldChange('rest',
                            currentExercise.rest === preset.value ? undefined : preset.value
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                      <div className="relative ml-0.5">
                        <Input
                          type="number"
                          value={currentExercise.rest ?? ''}
                          onChange={(e) => handleExerciseFieldChange('rest', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Custom"
                          className={cn(
                            'h-7 w-[4.5rem] rounded-full text-xs text-center pr-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                            currentExercise.rest && !REST_PRESETS.some(p => p.value === currentExercise.rest)
                              ? 'border-primary'
                              : ''
                          )}
                        />
                        <span className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">s</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Coaching */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coaching</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Form Cues</Label>
                      <Textarea
                        value={currentExercise.form ?? ''}
                        onChange={(e) => handleExerciseFieldChange('form', e.target.value)}
                        placeholder="Form cues and technique tips..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Input
                        value={currentExercise.notes ?? ''}
                        onChange={(e) => handleExerciseFieldChange('notes', e.target.value)}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Media */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media</p>
                  <ExerciseVideoManager
                    exerciseName={currentExercise.name}
                    currentYoutubeVideoId={currentExercise.youtubeVideoId}
                    onYoutubeVideoIdChange={(videoId) => handleExerciseFieldChange('youtubeVideoId', videoId)}
                  />
                </div>

                <Separator />

                {/* Options */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={currentExercise.isElbowSafe ?? false}
                        onCheckedChange={(checked) => handleExerciseFieldChange('isElbowSafe', checked)}
                      />
                      <Label className="text-sm flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Elbow Safe
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!currentExercise.alternative}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleExerciseFieldChange('alternative', { name: '' })
                          } else {
                            handleExerciseFieldChange('alternative', undefined)
                          }
                        }}
                      />
                      <Label className="text-sm">Alternative</Label>
                    </div>
                  </div>

                  {currentExercise.alternative && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-3 border border-dashed">
                      <p className="text-xs font-medium text-muted-foreground">Alternative (for injury protocol)</p>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <Input
                            value={currentExercise.alternative?.name ?? ''}
                            onChange={(e) => handleExerciseFieldChange('alternative', {
                              ...currentExercise.alternative,
                              name: e.target.value,
                            })}
                            placeholder="Alternative name"
                            className="h-8"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Sets</Label>
                            <Input
                              type="number"
                              value={currentExercise.alternative?.sets ?? ''}
                              onChange={(e) => handleExerciseFieldChange('alternative', {
                                ...currentExercise.alternative,
                                name: currentExercise.alternative?.name ?? '',
                                sets: e.target.value ? Number(e.target.value) : undefined,
                              })}
                              placeholder="3"
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Reps</Label>
                            <Input
                              type="number"
                              value={currentExercise.alternative?.reps ?? ''}
                              onChange={(e) => handleExerciseFieldChange('alternative', {
                                ...currentExercise.alternative,
                                name: currentExercise.alternative?.name ?? '',
                                reps: e.target.value ? Number(e.target.value) : undefined,
                              })}
                              placeholder="10"
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Form Cues</Label>
                          <Textarea
                            value={currentExercise.alternative?.form ?? ''}
                            onChange={(e) => handleExerciseFieldChange('alternative', {
                              ...currentExercise.alternative,
                              name: currentExercise.alternative?.name ?? '',
                              form: e.target.value,
                            })}
                            placeholder="Alternative form cues..."
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
          )
        })()}
      </DialogContent>
    </Dialog>

    {/* Remove Section Confirmation */}
    <AlertDialog open={!!removingSectionKey} onOpenChange={(open) => { if (!open) setRemovingSectionKey(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Section?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the{' '}
            <strong>
              {SECTIONS.find(s => s.key === removingSectionKey)?.label}
            </strong>{' '}
            section and all {removingSectionKey ? getExercisesForSection(removingSectionKey).length : 0} exercise(s) in it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => removingSectionKey && removeSection(removingSectionKey)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
