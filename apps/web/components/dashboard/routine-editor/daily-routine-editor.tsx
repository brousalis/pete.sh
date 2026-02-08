'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea'
import type { DailyRoutine } from '@/lib/types/fitness.types'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  GripVertical,
  Info,
  Lightbulb,
  Moon,
  Plus,
  Sun,
  Trash2,
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

interface RoutineCardProps {
  routine: DailyRoutine
  type: 'morning' | 'night'
  onUpdate: (routine: DailyRoutine) => void
}

function RoutineCard({ routine, type, onUpdate }: RoutineCardProps) {
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const icon =
    type === 'morning' ? (
      <Sun className="h-5 w-5 text-amber-500" />
    ) : (
      <Moon className="h-5 w-5 text-indigo-500" />
    )
  const bgColor =
    type === 'morning'
      ? 'bg-amber-50 dark:bg-amber-950/20'
      : 'bg-indigo-50 dark:bg-indigo-950/20'

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${seconds}s`
  }

  const totalDuration = routine.exercises.reduce(
    (sum, ex) => sum + ex.duration,
    0
  )

  const updateExercise = (index: number, updates: Partial<RoutineExercise>) => {
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
    onUpdate({ ...routine, exercises: newExercises })
  }

  const addExercise = () => {
    const newExercise: RoutineExercise = {
      name: 'New Exercise',
      duration: 60,
      description: '',
      why: '',
      action: '',
      youtubeDemo: '',
    }
    onUpdate({
      ...routine,
      exercises: [...routine.exercises, newExercise],
      duration: Math.ceil((totalDuration + 60) / 60),
    })
  }

  const removeExercise = (index: number) => {
    const newExercises = routine.exercises.filter((_, i) => i !== index)
    const newDuration = newExercises.reduce((sum, ex) => sum + ex.duration, 0)
    onUpdate({
      ...routine,
      exercises: newExercises,
      duration: Math.ceil(newDuration / 60),
    })
  }

  const moveExercise = (fromIndex: number, toIndex: number) => {
    const newExercises = [...routine.exercises]
    const moved = newExercises.splice(fromIndex, 1)[0]
    if (moved === undefined) return
    newExercises.splice(toIndex, 0, moved)
    onUpdate({ ...routine, exercises: newExercises })
  }

  return (
    <Card className={bgColor}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-lg">{routine.name}</CardTitle>
              <CardDescription className="text-xs">
                {routine.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {formatDuration(totalDuration)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Routine Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Routine Name</Label>
            <Input
              value={routine.name}
              onChange={e => onUpdate({ ...routine, name: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ID</Label>
            <Input
              value={routine.id}
              onChange={e => onUpdate({ ...routine, id: e.target.value })}
              className="bg-background font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={routine.description}
            onChange={e =>
              onUpdate({ ...routine, description: e.target.value })
            }
            placeholder="When and why to do this routine..."
            rows={2}
            className="bg-background"
          />
        </div>

        {/* Exercises */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Exercises</Label>
          <div className="space-y-2">
            {routine.exercises.map((exercise, index) => (
              <Collapsible
                key={index}
                open={expandedExercise === index}
                onOpenChange={open => setExpandedExercise(open ? index : null)}
              >
                <Card className="bg-background">
                  <CollapsibleTrigger asChild>
                    <div className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 p-3">
                      <GripVertical className="text-muted-foreground h-4 w-4 cursor-grab" />
                      <span className="flex-1 text-sm font-medium">
                        {exercise.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(exercise.duration)}
                      </Badge>
                      {expandedExercise === index ? (
                        <ChevronDown className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronRight className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 border-t pt-0 pb-3">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={exercise.name}
                            onChange={e =>
                              updateExercise(index, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={exercise.duration}
                            onChange={e =>
                              updateExercise(index, {
                                duration: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs">
                          <Info className="h-3 w-3" />
                          Description
                        </Label>
                        <Textarea
                          value={exercise.description}
                          onChange={e =>
                            updateExercise(index, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Brief description of the exercise..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs">
                          <Lightbulb className="h-3 w-3" />
                          Why
                        </Label>
                        <Input
                          value={exercise.why}
                          onChange={e =>
                            updateExercise(index, { why: e.target.value })
                          }
                          placeholder="Why this exercise is important..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Action / How To</Label>
                        <Textarea
                          value={exercise.action}
                          onChange={e =>
                            updateExercise(index, { action: e.target.value })
                          }
                          placeholder="Step by step instructions..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs">
                          <Youtube className="h-3 w-3" />
                          YouTube Demo
                        </Label>
                        <Input
                          value={exercise.youtubeDemo || ''}
                          onChange={e =>
                            updateExercise(index, { youtubeDemo: e.target.value })
                          }
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>

                      <div className="flex justify-between pt-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={index === 0}
                            onClick={() => moveExercise(index, index - 1)}
                          >
                            Move Up
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={index === routine.exercises.length - 1}
                            onClick={() => moveExercise(index, index + 1)}
                          >
                            Move Down
                          </Button>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addExercise}>
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function DailyRoutineEditor({
  dailyRoutines,
  onUpdate,
}: DailyRoutineEditorProps) {
  // Handle loading state
  if (!dailyRoutines) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <Sun className="h-5 w-5 text-amber-500" />
              Morning Stretch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <Moon className="h-5 w-5 text-indigo-500" />
              Night Stretch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const updateMorning = (routine: DailyRoutine) => {
    onUpdate({ ...dailyRoutines, morning: routine })
  }

  const updateNight = (routine: DailyRoutine) => {
    onUpdate({ ...dailyRoutines, night: routine })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RoutineCard
        routine={dailyRoutines.morning}
        type="morning"
        onUpdate={updateMorning}
      />
      <RoutineCard
        routine={dailyRoutines.night}
        type="night"
        onUpdate={updateNight}
      />
    </div>
  )
}
