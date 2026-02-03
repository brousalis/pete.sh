'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Trash2,
  Youtube,
  Clock,
  RefreshCw,
  Hash,
  Shield,
  Copy
} from 'lucide-react'
import type { Exercise } from '@/lib/types/fitness.types'

interface ExerciseEditorProps {
  exercise: Exercise
  index: number
  onUpdate: (exercise: Exercise) => void
  onDelete: () => void
  onDuplicate: () => void
  dragHandleProps?: Record<string, unknown>
}

export function ExerciseEditor({
  exercise,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps
}: ExerciseEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAlternative, setShowAlternative] = useState(!!exercise.alternative)

  const handleFieldChange = <K extends keyof Exercise>(field: K, value: Exercise[K]) => {
    onUpdate({ ...exercise, [field]: value })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${seconds}s`
  }

  return (
    <Card className={`group ${isExpanded ? 'ring-2 ring-primary' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/50">
            {/* Drag Handle */}
            <div
              {...dragHandleProps}
              className="cursor-grab hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Exercise Number */}
            <Badge variant="outline" className="text-xs font-mono">
              {exercise.id?.split('-').pop()?.toUpperCase() || index + 1}
            </Badge>

            {/* Exercise Name */}
            <span className="flex-1 font-medium text-sm">{exercise.name}</span>

            {/* Quick Info Badges */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {exercise.sets && exercise.reps && (
                <Badge variant="secondary" className="text-xs">
                  {exercise.sets}×{exercise.reps}
                </Badge>
              )}
              {exercise.duration && !exercise.sets && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(exercise.duration)}
                </Badge>
              )}
              {exercise.isElbowSafe && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  <Shield className="h-3 w-3" />
                </Badge>
              )}
              {exercise.youtubeVideoId && (
                <Youtube className="h-3 w-3 text-red-500" />
              )}
            </div>

            {/* Expand Icon */}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Exercise Name</Label>
                <Input
                  value={exercise.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Exercise name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Exercise ID</Label>
                <Input
                  value={exercise.id}
                  onChange={(e) => handleFieldChange('id', e.target.value)}
                  placeholder="e.g., monday-a1"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Sets/Reps/Duration */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Sets
                </Label>
                <Input
                  type="number"
                  value={exercise.sets ?? ''}
                  onChange={(e) => handleFieldChange('sets', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Reps
                </Label>
                <Input
                  type="number"
                  value={exercise.reps ?? ''}
                  onChange={(e) => handleFieldChange('reps', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration (s)
                </Label>
                <Input
                  type="number"
                  value={exercise.duration ?? ''}
                  onChange={(e) => handleFieldChange('duration', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Rest (s)</Label>
                <Input
                  type="number"
                  value={exercise.rest ?? ''}
                  onChange={(e) => handleFieldChange('rest', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="90"
                />
              </div>
            </div>

            {/* Form & Notes */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Form Cues</Label>
                <Textarea
                  value={exercise.form ?? ''}
                  onChange={(e) => handleFieldChange('form', e.target.value)}
                  placeholder="Form cues and technique tips..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={exercise.notes ?? ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* YouTube & Elbow Safe */}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Youtube className="h-3 w-3 text-red-500" />
                  YouTube Video ID
                </Label>
                <Input
                  value={exercise.youtubeVideoId ?? ''}
                  onChange={(e) => handleFieldChange('youtubeVideoId', e.target.value)}
                  placeholder="e.g., dQw4w9WgXcQ"
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={exercise.isElbowSafe ?? false}
                  onCheckedChange={(checked) => handleFieldChange('isElbowSafe', checked)}
                />
                <Label className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Elbow Safe
                </Label>
              </div>
            </div>

            {/* Alternative Exercise */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showAlternative}
                  onCheckedChange={(checked) => {
                    setShowAlternative(checked)
                    if (!checked) {
                      handleFieldChange('alternative', undefined)
                    }
                  }}
                />
                <Label className="text-xs">Has Alternative Exercise</Label>
              </div>

              {showAlternative && (
                <div className="p-3 bg-muted rounded-lg space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Alternative (for injury protocol)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={exercise.alternative?.name ?? ''}
                      onChange={(e) => handleFieldChange('alternative', {
                        ...exercise.alternative,
                        name: e.target.value,
                      })}
                      placeholder="Alternative name"
                    />
                    <Input
                      type="number"
                      value={exercise.alternative?.sets ?? ''}
                      onChange={(e) => handleFieldChange('alternative', {
                        ...exercise.alternative,
                        name: exercise.alternative?.name ?? '',
                        sets: e.target.value ? Number(e.target.value) : undefined,
                      })}
                      placeholder="Sets"
                    />
                    <Input
                      type="number"
                      value={exercise.alternative?.reps ?? ''}
                      onChange={(e) => handleFieldChange('alternative', {
                        ...exercise.alternative,
                        name: exercise.alternative?.name ?? '',
                        reps: e.target.value ? Number(e.target.value) : undefined,
                      })}
                      placeholder="Reps"
                    />
                    <Input
                      value={exercise.alternative?.youtubeVideoId ?? ''}
                      onChange={(e) => handleFieldChange('alternative', {
                        ...exercise.alternative,
                        name: exercise.alternative?.name ?? '',
                        youtubeVideoId: e.target.value,
                      })}
                      placeholder="YouTube ID"
                      className="font-mono text-xs"
                    />
                  </div>
                  <Textarea
                    value={exercise.alternative?.form ?? ''}
                    onChange={(e) => handleFieldChange('alternative', {
                      ...exercise.alternative,
                      name: exercise.alternative?.name ?? '',
                      form: e.target.value,
                    })}
                    placeholder="Alternative form cues..."
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
