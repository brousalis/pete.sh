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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { DailyRoutine } from '@/lib/types/fitness.types'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  GripVertical,
  Info,
  Lightbulb,
  Moon,
  Plus,
  Sun,
  Trash2,
  X,
  Youtube,
} from 'lucide-react'
import { useState } from 'react'

interface DailyRoutineEditorProps {
  dailyRoutines?: {
    morning: DailyRoutine
    night: DailyRoutine
  }
  onUpdate: (routines: { morning: DailyRoutine; night: DailyRoutine }) => void
}

interface RoutineExercise {
  name: string
  duration: number
  description: string
  why: string
  action: string
  youtubeDemo?: string
}

interface SelectedRoutineExercise {
  type: 'morning' | 'night'
  index: number
}

function SortableRoutineExercise({
  sortId,
  exercise,
  index,
  isSelected,
  onSelect,
  onDelete,
  formatDuration,
}: {
  sortId: string
  exercise: RoutineExercise
  index: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  formatDuration: (seconds?: number) => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-1 rounded-md border pl-0.5 pr-2.5 py-1.5 cursor-pointer transition-all ${
        isDragging
          ? 'opacity-50 shadow-lg z-50 border-primary/50 bg-background'
          : isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
            : 'border-border bg-background hover:border-muted-foreground/30 hover:bg-accent/30'
      }`}
    >
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground/50 hover:text-muted-foreground rounded"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Badge variant="outline" className="text-[10px] font-mono shrink-0 h-5 w-5 justify-center px-0">
        {index + 1}
      </Badge>
      <span className="flex-1 text-xs font-medium truncate">{exercise.name}</span>
      <Badge variant="secondary" className="text-[10px] tabular-nums px-1 py-0 h-4">
        {formatDuration(exercise.duration)}
      </Badge>
      <button
        className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-destructive hover:bg-destructive/10 shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

export function DailyRoutineEditor({
  dailyRoutines,
  onUpdate,
}: DailyRoutineEditorProps) {
  const [selected, setSelected] = useState<SelectedRoutineExercise | null>(null)
  const [deletingExercise, setDeletingExercise] = useState<SelectedRoutineExercise | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!dailyRoutines) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4 text-amber-500" />
              Morning Stretch
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-muted-foreground text-sm">Loading...</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-950/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Moon className="h-4 w-4 text-indigo-500" />
              Night Stretch
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-muted-foreground text-sm">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const updateRoutine = (type: 'morning' | 'night', routine: DailyRoutine) => {
    onUpdate({ ...dailyRoutines, [type]: routine })
  }

  const getRoutine = (type: 'morning' | 'night') =>
    type === 'morning' ? dailyRoutines.morning : dailyRoutines.night

  const updateExercise = (type: 'morning' | 'night', index: number, updates: Partial<RoutineExercise>) => {
    const routine = getRoutine(type)
    const newExercises = routine.exercises.map((ex, i) => {
      if (i !== index) return ex
      return {
        name: ex.name,
        duration: ex.duration,
        description: ex.description,
        why: ex.why,
        action: ex.action,
        youtubeDemo: ex.youtubeDemo ?? '',
        ...updates,
      }
    })
    updateRoutine(type, { ...routine, exercises: newExercises })
  }

  const addExercise = (type: 'morning' | 'night') => {
    const routine = getRoutine(type)
    const totalDuration = routine.exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0)
    const newExercise: RoutineExercise = {
      name: 'New Exercise',
      duration: 60,
      description: '',
      why: '',
      action: '',
      youtubeDemo: '',
    }
    updateRoutine(type, {
      ...routine,
      exercises: [...routine.exercises, newExercise],
      duration: Math.ceil((totalDuration + 60) / 60),
    })
    setSelected({ type, index: routine.exercises.length })
  }

  const removeExercise = (type: 'morning' | 'night', index: number) => {
    const routine = getRoutine(type)
    const newExercises = routine.exercises.filter((_, i) => i !== index)
    const newDuration = newExercises.reduce((sum, ex) => sum + (ex.duration || 0), 0)
    updateRoutine(type, {
      ...routine,
      exercises: newExercises,
      duration: Math.ceil(newDuration / 60),
    })
    if (selected?.type === type && selected.index === index) {
      setSelected(null)
    } else if (selected?.type === type && selected.index > index) {
      setSelected({ type, index: selected.index - 1 })
    }
    setDeletingExercise(null)
  }

  const moveExercise = (type: 'morning' | 'night', fromIndex: number, toIndex: number) => {
    const routine = getRoutine(type)
    const newExercises = [...routine.exercises]
    const moved = newExercises.splice(fromIndex, 1)[0]
    if (moved === undefined) return
    newExercises.splice(toIndex, 0, moved)
    updateRoutine(type, { ...routine, exercises: newExercises })
    if (selected?.type === type && selected.index === fromIndex) {
      setSelected({ type, index: toIndex })
    }
  }

  const handleDragEnd = (type: 'morning' | 'night') => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const routine = getRoutine(type)
    const oldIndex = routine.exercises.findIndex((_, i) => `${type}-${i}` === active.id)
    const newIndex = routine.exercises.findIndex((_, i) => `${type}-${i}` === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    moveExercise(type, oldIndex, newIndex)
  }

  const formatDuration = (seconds?: number) => {
    if (seconds == null || isNaN(seconds) || seconds <= 0) return '--'
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${seconds}s`
  }

  const currentExercise = selected
    ? getRoutine(selected.type).exercises[selected.index]
    : null
  const currentRoutine = selected ? getRoutine(selected.type) : null

  const renderCard = (type: 'morning' | 'night') => {
    const routine = getRoutine(type)
    const icon = type === 'morning'
      ? <Sun className="h-4 w-4 text-amber-500" />
      : <Moon className="h-4 w-4 text-indigo-500" />
    const bgColor = type === 'morning'
      ? 'bg-amber-50 dark:bg-amber-950/20'
      : 'bg-indigo-50 dark:bg-indigo-950/20'
    const accentColor = type === 'morning' ? 'border-l-amber-500' : 'border-l-indigo-500'
    const totalDuration = routine.exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0)

    return (
      <Card className={`${bgColor} border-l-4 ${accentColor}`}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-sm font-semibold">{routine.name}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
              <Clock className="mr-0.5 h-3 w-3" />
              {formatDuration(totalDuration)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4 pb-4">
          {/* Routine meta -- compact row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[11px] text-muted-foreground">Name</Label>
              <Input
                value={routine.name}
                onChange={e => updateRoutine(type, { ...routine, name: e.target.value })}
                className="bg-background h-7 text-xs"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[11px] text-muted-foreground">Duration</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={routine.duration || ''}
                  onChange={e => updateRoutine(type, { ...routine, duration: Number(e.target.value) || 0 })}
                  className="bg-background h-7 text-xs pr-8"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
                  min
                </span>
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[11px] text-muted-foreground">Description</Label>
              <Input
                value={routine.description}
                onChange={e => updateRoutine(type, { ...routine, description: e.target.value })}
                placeholder="Brief description..."
                className="bg-background h-7 text-xs"
              />
            </div>
          </div>

          {/* Exercise list -- sortable */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd(type)}
          >
            <SortableContext
              items={routine.exercises.map((_, i) => `${type}-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {routine.exercises.map((exercise, index) => (
                  <SortableRoutineExercise
                    key={`${type}-${index}`}
                    sortId={`${type}-${index}`}
                    exercise={exercise}
                    index={index}
                    isSelected={selected?.type === type && selected?.index === index}
                    onSelect={() => setSelected({ type, index })}
                    onDelete={() => setDeletingExercise({ type, index })}
                    formatDuration={formatDuration}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground border border-dashed h-7 text-xs"
            onClick={() => addExercise(type)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Exercise
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <div className="grid gap-5 lg:grid-cols-2">
      {renderCard('morning')}
      {renderCard('night')}
    </div>

    {/* Exercise Detail Sheet */}
    <Sheet
      open={!!selected && !!currentExercise}
      onOpenChange={(open) => { if (!open) setSelected(null) }}
    >
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col gap-0">
        {currentExercise && selected && currentRoutine && (
          <>
            <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {selected.type === 'morning'
                    ? <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                    : <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
                  }
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0 h-5 w-6 justify-center px-0">
                    {selected.index + 1}
                  </Badge>
                  <SheetTitle className="text-sm truncate">
                    {currentExercise.name}
                  </SheetTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={selected.index === 0}
                    onClick={() => moveExercise(selected.type, selected.index, selected.index - 1)}
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={selected.index >= currentRoutine.exercises.length - 1}
                    onClick={() => moveExercise(selected.type, selected.index, selected.index + 1)}
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelected(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Name + Duration */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Exercise Name</Label>
                    <Input
                      value={currentExercise.name}
                      onChange={(e) => updateExercise(selected.type, selected.index, { name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={currentExercise.duration || ''}
                        onChange={(e) => updateExercise(selected.type, selected.index, { duration: Number(e.target.value) })}
                        className="h-9 pr-6"
                      />
                      <span className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">s</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Description
                  </Label>
                  <Textarea
                    value={currentExercise.description}
                    onChange={(e) => updateExercise(selected.type, selected.index, { description: e.target.value })}
                    placeholder="Brief description of the exercise..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Why */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Why
                  </Label>
                  <Input
                    value={currentExercise.why}
                    onChange={(e) => updateExercise(selected.type, selected.index, { why: e.target.value })}
                    placeholder="Why this exercise is important..."
                  />
                </div>

                <Separator />

                {/* Action / How To */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Action / How To</Label>
                  <Textarea
                    value={currentExercise.action}
                    onChange={(e) => updateExercise(selected.type, selected.index, { action: e.target.value })}
                    placeholder="Step by step instructions..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* YouTube */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Youtube className="h-3 w-3" />
                    YouTube Demo
                  </Label>
                  <Input
                    value={currentExercise.youtubeDemo || ''}
                    onChange={(e) => updateExercise(selected.type, selected.index, { youtubeDemo: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <Separator />

                {/* Delete */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                  onClick={() => setDeletingExercise(selected)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete Exercise
                </Button>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>

    {/* Delete Confirmation */}
    <AlertDialog open={!!deletingExercise} onOpenChange={(open) => { if (!open) setDeletingExercise(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Exercise?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove{' '}
            <strong>
              {deletingExercise
                ? getRoutine(deletingExercise.type).exercises[deletingExercise.index]?.name
                : ''}
            </strong>{' '}
            from the routine.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deletingExercise && removeExercise(deletingExercise.type, deletingExercise.index)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
