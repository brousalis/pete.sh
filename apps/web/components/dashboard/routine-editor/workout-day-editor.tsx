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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type {
  DayOfWeek,
  Exercise,
  WeeklySchedule,
  Workout,
  WorkoutFocus,
} from '@/lib/types/fitness.types'
import {
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Flame,
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
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useState } from 'react'
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
  borderColor: string
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'warmup',
    label: 'Warm-up',
    icon: <Flame className="h-4 w-4" />,
    borderColor: 'border-l-orange-500',
  },
  {
    key: 'exercises',
    label: 'Main Workout',
    icon: <Dumbbell className="h-4 w-4" />,
    borderColor: 'border-l-blue-500',
  },
  {
    key: 'finisher',
    label: 'Finisher',
    icon: <Zap className="h-4 w-4" />,
    borderColor: 'border-l-purple-500',
  },
  {
    key: 'metabolicFlush',
    label: 'Metabolic Flush',
    icon: <Wind className="h-4 w-4" />,
    borderColor: 'border-l-green-500',
  },
  {
    key: 'mobility',
    label: 'Mobility',
    icon: <StretchHorizontal className="h-4 w-4" />,
    borderColor: 'border-l-cyan-500',
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

  const handleDragEnd = (sectionKey: SectionType) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const exercises = [...getExercisesForSection(sectionKey)]
    const oldIndex = exercises.findIndex((_, i) => `${sectionKey}-${i}` === active.id)
    const newIndex = exercises.findIndex((_, i) => `${sectionKey}-${i}` === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const moved = exercises.splice(oldIndex, 1)[0]
    if (moved === undefined) return
    exercises.splice(newIndex, 0, moved)
    updateExercisesForSection(sectionKey, exercises)

    if (selectedExercise?.section === sectionKey) {
      if (selectedExercise.index === oldIndex) {
        setSelectedExercise({ section: sectionKey, index: newIndex })
      } else if (selectedExercise.index > oldIndex && selectedExercise.index <= newIndex) {
        setSelectedExercise({ section: sectionKey, index: selectedExercise.index - 1 })
      } else if (selectedExercise.index < oldIndex && selectedExercise.index >= newIndex) {
        setSelectedExercise({ section: sectionKey, index: selectedExercise.index + 1 })
      }
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
              <Button
                key={section.key}
                variant="ghost"
                className="text-muted-foreground w-full justify-start border border-dashed py-5"
                onClick={() => addExercise(section.key)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {section.label} Section
              </Button>
            )
          }

          const durationEstimate = estimateSectionDuration(exercises)

          return (
            <Collapsible
              key={section.key}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.key)}
            >
              <Card className={`border-l-4 ${section.borderColor}`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="group/section hover:bg-accent/30 cursor-pointer py-3 px-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {section.icon}
                        <CardTitle className="text-base font-semibold">
                          {sectionData?.name || section.label}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
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
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(section.key)}
                    >
                      <SortableContext
                        items={exercises.map((_, i) => `${section.key}-${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {exercises.map((exercise, index) => (
                            <ExerciseEditor
                              key={exercise.id || index}
                              exercise={exercise}
                              index={index}
                              sortId={`${section.key}-${index}`}
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
                    </DndContext>

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
          )
        })}
      </div>
    </div>

    {/* Exercise Detail Sheet */}
    <Sheet
      open={!!selectedExercise && !!currentExercise}
      onOpenChange={(open) => {
        if (!open) setSelectedExercise(null)
      }}
    >
      <SheetContent
        side="right"
        className="sm:max-w-lg w-full p-0 flex flex-col gap-0"
      >
        {currentExercise && selectedExercise && (
          <>
            {/* Sheet Header */}
            <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Badge variant="outline" className="text-xs font-mono shrink-0 h-6 w-8 justify-center">
                    {currentExercise.id?.split('-').pop()?.toUpperCase() || selectedExercise.index + 1}
                  </Badge>
                  <SheetTitle className="text-base truncate">
                    {currentExercise.name}
                  </SheetTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={selectedExercise.index === 0}
                    onClick={() => navigateExercise('prev')}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={
                      selectedExercise.index >=
                      getExercisesForSection(selectedExercise.section).length - 1
                    }
                    onClick={() => navigateExercise('next')}
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
            </SheetHeader>

            {/* Sheet Body */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Exercise Name */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Exercise Name</Label>
                  <Input
                    value={currentExercise.name}
                    onChange={(e) => handleExerciseFieldChange('name', e.target.value)}
                  />
                </div>

                <Separator />

                {/* Programming */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Programming</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sets</Label>
                      <Input
                        type="number"
                        value={currentExercise.sets ?? ''}
                        onChange={(e) => handleExerciseFieldChange('sets', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="3"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Reps</Label>
                      <Input
                        type="number"
                        value={currentExercise.reps ?? ''}
                        onChange={(e) => handleExerciseFieldChange('reps', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="10"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={currentExercise.duration ?? ''}
                          onChange={(e) => handleExerciseFieldChange('duration', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="60"
                          className="h-9 pr-6"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">s</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Rest</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={currentExercise.rest ?? ''}
                          onChange={(e) => handleExerciseFieldChange('rest', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="90"
                          className="h-9 pr-6"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">s</span>
                      </div>
                    </div>
                  </div>
                  {currentExercise.sets && currentExercise.reps && (
                    <p className="text-xs text-muted-foreground">
                      {currentExercise.sets}&times;{currentExercise.reps}
                      {currentExercise.duration ? ` / ${formatDuration(currentExercise.duration)}` : ''}
                      {currentExercise.rest ? ` — ${formatDuration(currentExercise.rest)} rest` : ''}
                    </p>
                  )}
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
        )}
      </SheetContent>
    </Sheet>

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
