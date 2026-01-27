"use client"

import { useState } from "react"
import { CheckCircle2, Circle, Sun, Moon, Clock, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { DailyRoutine, RoutineCompletion } from "@/lib/types/fitness.types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface DailyRoutineCardProps {
  routine: DailyRoutine
  completion?: RoutineCompletion
  day: string
  onComplete: () => void
}

export function DailyRoutineCard({ routine, completion, day, onComplete }: DailyRoutineCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const isCompleted = completion?.completed || false

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsCompleting(true)
    try {
      await onComplete()
      toast.success(`${routine.name} completed!`)
    } catch (error) {
      toast.error("Failed to mark routine complete")
    } finally {
      setIsCompleting(false)
    }
  }

  const Icon = routine.type === "morning" ? Sun : Moon
  const iconBgClass = routine.type === "morning" 
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn(
        "rounded-lg border transition-all",
        isCompleted && "bg-green-500/5 border-green-500/20",
        !isCompleted && "bg-muted/30"
      )}>
        {/* Compact Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
            <div className={cn("rounded-md p-1.5", iconBgClass)}>
              <Icon className="size-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{routine.name}</span>
                <span className="text-xs text-muted-foreground">
                  {routine.duration}m · {routine.exercises.length} exercises
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isCompleted ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                  Done
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  {isCompleting ? "..." : "Complete"}
                </Button>
              )}
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            <p className="text-xs text-muted-foreground mb-2 pl-9">
              {routine.description}
            </p>
            <div className="space-y-1.5 pl-9">
              {routine.exercises.map((exercise, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-background/50"
                >
                  <span className="text-sm">{exercise.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {Math.floor(exercise.duration / 60)}m
                  </span>
                </div>
              ))}
            </div>
            {completion?.completedAt && (
              <p className="text-xs text-muted-foreground mt-2 pl-9">
                Completed at {format(new Date(completion.completedAt), "h:mm a")}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
