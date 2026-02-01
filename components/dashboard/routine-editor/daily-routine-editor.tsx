'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Sun, 
  Moon, 
  Plus, 
  Trash2, 
  GripVertical,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Lightbulb
} from 'lucide-react'
import type { DailyRoutine } from '@/lib/types/fitness.types'

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
}

interface RoutineCardProps {
  routine: DailyRoutine
  type: 'morning' | 'night'
  onUpdate: (routine: DailyRoutine) => void
}

function RoutineCard({ routine, type, onUpdate }: RoutineCardProps) {
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const icon = type === 'morning' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-500" />
  const bgColor = type === 'morning' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-indigo-50 dark:bg-indigo-950/20'

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${seconds}s`
  }

  const totalDuration = routine.exercises.reduce((sum, ex) => sum + ex.duration, 0)

  const updateExercise = (index: number, updates: Partial<RoutineExercise>) => {
    const newExercises = [...routine.exercises]
    newExercises[index] = { ...newExercises[index], ...updates }
    onUpdate({ ...routine, exercises: newExercises })
  }

  const addExercise = () => {
    const newExercise: RoutineExercise = {
      name: 'New Exercise',
      duration: 60,
      description: '',
      why: '',
      action: '',
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
    const [moved] = newExercises.splice(fromIndex, 1)
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
              <CardDescription className="text-xs">{routine.description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
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
              onChange={(e) => onUpdate({ ...routine, name: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ID</Label>
            <Input
              value={routine.id}
              onChange={(e) => onUpdate({ ...routine, id: e.target.value })}
              className="bg-background font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={routine.description}
            onChange={(e) => onUpdate({ ...routine, description: e.target.value })}
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
                onOpenChange={(open) => setExpandedExercise(open ? index : null)}
              >
                <Card className="bg-background">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/50">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="flex-1 font-medium text-sm">{exercise.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(exercise.duration)}
                      </Badge>
                      {expandedExercise === index ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 space-y-3 border-t">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={exercise.name}
                            onChange={(e) => updateExercise(index, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={exercise.duration}
                            onChange={(e) => updateExercise(index, { duration: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Description
                        </Label>
                        <Textarea
                          value={exercise.description}
                          onChange={(e) => updateExercise(index, { description: e.target.value })}
                          placeholder="Brief description of the exercise..."
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Why
                        </Label>
                        <Input
                          value={exercise.why}
                          onChange={(e) => updateExercise(index, { why: e.target.value })}
                          placeholder="Why this exercise is important..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Action / How To</Label>
                        <Textarea
                          value={exercise.action}
                          onChange={(e) => updateExercise(index, { action: e.target.value })}
                          placeholder="Step by step instructions..."
                          rows={3}
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
                          <Trash2 className="h-4 w-4 mr-1" />
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
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function DailyRoutineEditor({ dailyRoutines, onUpdate }: DailyRoutineEditorProps) {
  // Handle loading state
  if (!dailyRoutines) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-3">
              <Sun className="h-5 w-5 text-amber-500" />
              Morning Stretch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-3">
              <Moon className="h-5 w-5 text-indigo-500" />
              Night Stretch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading...</p>
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
