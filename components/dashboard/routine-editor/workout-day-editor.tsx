'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Plus, 
  ChevronDown,
  ChevronRight,
  Flame,
  Dumbbell,
  Wind,
  StretchHorizontal,
  Zap,
  Target
} from 'lucide-react'
import type { 
  Workout, 
  Exercise, 
  DayOfWeek, 
  WeeklySchedule,
  WorkoutFocus,
  Warmup,
  WorkoutSection 
} from '@/lib/types/fitness.types'
import { ExerciseEditor } from './exercise-editor'

interface WorkoutDayEditorProps {
  workoutDefinitions?: Record<DayOfWeek, Workout>
  schedule?: WeeklySchedule
  selectedDay: DayOfWeek
  onSelectDay: (day: DayOfWeek) => void
  onUpdate: (definitions: Record<DayOfWeek, Workout>) => void
}

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const FOCUS_OPTIONS: { value: WorkoutFocus; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'conditioning', label: 'Conditioning' },
]

type SectionType = 'warmup' | 'exercises' | 'finisher' | 'metabolicFlush' | 'mobility'

interface SectionConfig {
  key: SectionType
  label: string
  icon: React.ReactNode
  description: string
  color: string
}

const SECTIONS: SectionConfig[] = [
  { 
    key: 'warmup', 
    label: 'Warm-up', 
    icon: <Flame className="h-4 w-4" />, 
    description: 'Skill & warm-up exercises',
    color: 'text-orange-500'
  },
  { 
    key: 'exercises', 
    label: 'Main Workout', 
    icon: <Dumbbell className="h-4 w-4" />, 
    description: 'Primary exercises',
    color: 'text-blue-500'
  },
  { 
    key: 'finisher', 
    label: 'Finisher', 
    icon: <Zap className="h-4 w-4" />, 
    description: 'Optional finisher exercises',
    color: 'text-purple-500'
  },
  { 
    key: 'metabolicFlush', 
    label: 'Metabolic Flush', 
    icon: <Wind className="h-4 w-4" />, 
    description: 'Post-lift cardio',
    color: 'text-green-500'
  },
  { 
    key: 'mobility', 
    label: 'Mobility', 
    icon: <StretchHorizontal className="h-4 w-4" />, 
    description: 'Deep stretching',
    color: 'text-cyan-500'
  },
]

function generateExerciseId(day: DayOfWeek, section: SectionType, index: number): string {
  const prefix = day.slice(0, 3)
  const sectionPrefix = section === 'warmup' ? 'w' : section === 'exercises' ? '' : section.slice(0, 3)
  return `${prefix}-${sectionPrefix}${index + 1}`.replace('--', '-')
}

export function WorkoutDayEditor({ 
  workoutDefinitions, 
  schedule,
  selectedDay, 
  onSelectDay,
  onUpdate 
}: WorkoutDayEditorProps) {
  const [expandedSections, setExpandedSections] = useState<SectionType[]>(['exercises'])
  
  // Handle loading state
  if (!workoutDefinitions || !schedule) {
    return (
      <div className="space-y-4">
        {/* Day Selector */}
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectDay(day)}
              className="flex-1"
            >
              {DAY_LABELS[day]}
            </Button>
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Loading workout data...</p>
          </CardContent>
        </Card>
      </div>
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

  const updateWorkout = useCallback((updates: Partial<Workout>) => {
    onUpdate({
      ...workoutDefinitions,
      [selectedDay]: { ...workout, ...updates },
    })
  }, [workoutDefinitions, selectedDay, workout, onUpdate])

  const getExercisesForSection = (section: SectionType): Exercise[] => {
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
  }

  const updateExercisesForSection = (section: SectionType, exercises: Exercise[]) => {
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
        updateWorkout({ finisher: exercises.length > 0 ? exercises : undefined })
        break
      case 'metabolicFlush':
        updateWorkout({
          metabolicFlush: exercises.length > 0 
            ? (workout?.metabolicFlush 
                ? { ...workout.metabolicFlush, exercises }
                : { name: 'Metabolic Flush', exercises })
            : undefined,
        })
        break
      case 'mobility':
        updateWorkout({
          mobility: exercises.length > 0 
            ? (workout?.mobility 
                ? { ...workout.mobility, exercises }
                : { name: 'Mobility', exercises })
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
  }

  const updateExercise = (section: SectionType, index: number, exercise: Exercise) => {
    const exercises = [...getExercisesForSection(section)]
    exercises[index] = exercise
    updateExercisesForSection(section, exercises)
  }

  const deleteExercise = (section: SectionType, index: number) => {
    const exercises = getExercisesForSection(section).filter((_, i) => i !== index)
    updateExercisesForSection(section, exercises)
  }

  const duplicateExercise = (section: SectionType, index: number) => {
    const exercises = [...getExercisesForSection(section)]
    const original = exercises[index]
    const duplicate: Exercise = {
      ...original,
      id: generateExerciseId(selectedDay, section, exercises.length),
      name: `${original.name} (copy)`,
    }
    exercises.splice(index + 1, 0, duplicate)
    updateExercisesForSection(section, exercises)
  }

  const moveExercise = (section: SectionType, fromIndex: number, toIndex: number) => {
    const exercises = [...getExercisesForSection(section)]
    const [moved] = exercises.splice(fromIndex, 1)
    exercises.splice(toIndex, 0, moved)
    updateExercisesForSection(section, exercises)
  }

  if (!workout) {
    return (
      <div className="space-y-4">
        {/* Day Selector */}
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectDay(day)}
              className="flex-1"
            >
              {DAY_LABELS[day]}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No workout defined for {selectedDay}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {daySchedule?.focus}: {daySchedule?.goal}
            </p>
            <Button onClick={() => {
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
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workout
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Day Selector */}
      <div className="flex gap-2">
        {DAYS.map((day) => {
          const hasWorkout = !!workoutDefinitions[day]
          return (
            <Button
              key={day}
              variant={selectedDay === day ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectDay(day)}
              className="flex-1 relative"
            >
              {DAY_LABELS[day]}
              {hasWorkout && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full transform translate-x-1 -translate-y-1" />
              )}
            </Button>
          )
        })}
      </div>

      {/* Workout Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {workout.name}
              </CardTitle>
              <CardDescription>{daySchedule?.goal}</CardDescription>
            </div>
            <Badge variant="outline">{workout.focus}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Workout Name</Label>
              <Input
                value={workout.name}
                onChange={(e) => updateWorkout({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Focus</Label>
              <Select
                value={workout.focus}
                onValueChange={(value: WorkoutFocus) => updateWorkout({ focus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOCUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Goal</Label>
              <Input
                value={workout.goal ?? ''}
                onChange={(e) => updateWorkout({ goal: e.target.value })}
                placeholder="Workout goal..."
              />
            </div>
          </div>

          {/* Notes */}
          {workout.notes && workout.notes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <div className="flex flex-wrap gap-2">
                {workout.notes.map((note, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {note}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const exercises = getExercisesForSection(section.key)
          const isExpanded = expandedSections.includes(section.key)
          const hasExercises = exercises.length > 0
          const sectionData = section.key === 'warmup' 
            ? workout.warmup 
            : section.key === 'metabolicFlush'
              ? workout.metabolicFlush
              : section.key === 'mobility'
                ? workout.mobility
                : null

          // Skip sections that don't exist and aren't main exercises
          if (!hasExercises && section.key !== 'exercises' && section.key !== 'warmup') {
            return (
              <Button
                key={section.key}
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  addExercise(section.key)
                  setExpandedSections(prev => [...prev, section.key])
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {section.label}
              </Button>
            )
          }

          return (
            <Collapsible
              key={section.key}
              open={isExpanded}
              onOpenChange={() => toggleSection(section.key)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={section.color}>{section.icon}</span>
                        <CardTitle className="text-base">{section.label}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {exercises.length}
                        </Badge>
                        {sectionData?.duration && (
                          <span className="text-xs text-muted-foreground">
                            {sectionData.duration} min
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription className="text-xs">{section.description}</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {/* Section Settings */}
                    {(section.key === 'warmup' || section.key === 'metabolicFlush' || section.key === 'mobility') && (
                      <div className="flex gap-3 p-3 bg-muted rounded-lg">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Section Name</Label>
                          <Input
                            value={sectionData?.name ?? section.label}
                            onChange={(e) => {
                              if (section.key === 'warmup') {
                                updateWorkout({
                                  warmup: { ...workout.warmup, name: e.target.value, exercises: workout.warmup?.exercises ?? [] },
                                })
                              } else if (section.key === 'metabolicFlush') {
                                updateWorkout({
                                  metabolicFlush: { ...workout.metabolicFlush, name: e.target.value, exercises: workout.metabolicFlush?.exercises ?? [] },
                                })
                              } else if (section.key === 'mobility') {
                                updateWorkout({
                                  mobility: { ...workout.mobility, name: e.target.value, exercises: workout.mobility?.exercises ?? [] },
                                })
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Duration (min)</Label>
                          <Input
                            type="number"
                            value={sectionData?.duration ?? ''}
                            onChange={(e) => {
                              const duration = e.target.value ? Number(e.target.value) : undefined
                              if (section.key === 'warmup') {
                                updateWorkout({
                                  warmup: { ...workout.warmup, name: workout.warmup?.name ?? 'Warm-up', duration, exercises: workout.warmup?.exercises ?? [] },
                                })
                              } else if (section.key === 'metabolicFlush') {
                                updateWorkout({
                                  metabolicFlush: { ...workout.metabolicFlush, name: workout.metabolicFlush?.name ?? 'Metabolic Flush', duration, exercises: workout.metabolicFlush?.exercises ?? [] },
                                })
                              } else if (section.key === 'mobility') {
                                updateWorkout({
                                  mobility: { ...workout.mobility, name: workout.mobility?.name ?? 'Mobility', duration, exercises: workout.mobility?.exercises ?? [] },
                                })
                              }
                            }}
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}

                    {/* Exercises */}
                    <div className="space-y-2">
                      {exercises.map((exercise, index) => (
                        <ExerciseEditor
                          key={exercise.id || index}
                          exercise={exercise}
                          index={index}
                          onUpdate={(updated) => updateExercise(section.key, index, updated)}
                          onDelete={() => deleteExercise(section.key, index)}
                          onDuplicate={() => duplicateExercise(section.key, index)}
                        />
                      ))}
                    </div>

                    {/* Add Exercise Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => addExercise(section.key)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
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
  )
}
