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
import type { Exercise } from '@/lib/types/fitness.types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    Clock,
    Copy,
    GripVertical,
    Shield,
    Trash2,
    Video
} from 'lucide-react'
import { useState } from 'react'

interface ExerciseEditorProps {
  exercise: Exercise
  index: number
  sortId: string
  isSelected?: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export function ExerciseEditor({
  exercise,
  index,
  sortId,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: ExerciseEditorProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-2 rounded-lg border px-1 pr-3 py-2.5 cursor-pointer transition-all ${
        isDragging
          ? 'opacity-50 shadow-lg z-50 border-primary/50 bg-background'
          : isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
            : 'border-border hover:border-muted-foreground/30 hover:bg-accent/30'
      }`}
    >
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground/50 hover:text-muted-foreground rounded"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Badge variant="outline" className="text-[11px] font-mono shrink-0 h-6 w-7 justify-center">
        {exercise.id?.split('-').pop()?.toUpperCase() || index + 1}
      </Badge>

      <span className="flex-1 text-sm font-medium truncate">{exercise.name}</span>

      <div className="flex items-center gap-1.5">
        {exercise.sets && exercise.reps && (
          <Badge variant="secondary" className="text-[11px] tabular-nums px-1.5 py-0">
            {exercise.sets}&times;{exercise.reps}
          </Badge>
        )}
        {exercise.duration && (
          <Badge variant="secondary" className="text-[11px] tabular-nums px-1.5 py-0">
            <Clock className="h-3 w-3 mr-0.5" />
            {formatDuration(exercise.duration)}
          </Badge>
        )}
        {exercise.isElbowSafe && (
          <Shield className="h-3.5 w-3.5 text-green-500 shrink-0" />
        )}
        {exercise.youtubeVideoId && (
          <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        )}
      </div>

      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)} title="Delete">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Exercise?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove <strong>{exercise.name}</strong> from the workout. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
