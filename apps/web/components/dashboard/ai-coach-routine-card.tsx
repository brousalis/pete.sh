"use client"

/**
 * Shared RoutineVersionPreviewCard used by both the AI Coach panel
 * and the dedicated /fitness/coach page.
 */

import { Button } from "@/components/ui/button"
import type { RoutineChange, DailyRoutineChange } from "@/lib/types/ai-coach.types"
import type { RoutineChangeDiffEntry, ProgressiveOverloadEntry, DailyRoutineChangeDiffEntry } from "@/lib/utils/routine-change-utils"
import {
    AlertTriangle,
    ArrowRight,
    Check,
    Dumbbell,
    Loader2,
    Minus,
    Moon,
    Plus,
    Sun,
    X,
} from "lucide-react"

// ============================================
// TYPES
// ============================================

export interface RoutineProposal {
  status: 'pending_confirmation' | 'error'
  message?: string
  commitMessage?: string
  routineId?: string
  routineChanges?: RoutineChange[]
  progressiveOverload?: ProgressiveOverloadEntry[]
  dailyRoutineChanges?: DailyRoutineChange[]
  diff?: RoutineChangeDiffEntry[]
  dailyRoutineDiff?: DailyRoutineChangeDiffEntry[]
  changesApplied?: number
}

const SECTION_LABELS: Record<string, string> = {
  warmup: "Warmup",
  exercises: "Exercises",
  finisher: "Finisher",
  metabolicFlush: "Metabolic Flush",
  mobility: "Mobility",
  "progressive-overload": "Progressive Overload",
}

const DAILY_ROUTINE_LABELS: Record<string, string> = {
  morning: "Morning Routine",
  night: "Night Routine",
}

// ============================================
// SHARED DIFF ENTRY RENDERER
// ============================================

function DiffEntryRow({ entry }: { entry: { action: string; exerciseName: string; field?: string; before?: string; after?: string } }) {
  if (entry.action === "add") {
    return (
      <div className="text-[11px] text-accent-sage/80 flex items-center gap-1.5">
        <Plus className="h-2.5 w-2.5 text-accent-sage flex-shrink-0" />
        <span>
          {entry.exerciseName}
          {entry.after && <span className="text-muted-foreground"> — {entry.after}</span>}
        </span>
      </div>
    )
  }
  if (entry.action === "remove") {
    return (
      <div className="text-[11px] text-accent-rose/80 flex items-center gap-1.5 line-through">
        <Minus className="h-2.5 w-2.5 text-accent-rose flex-shrink-0" />
        <span>{entry.exerciseName}</span>
      </div>
    )
  }
  if (entry.action === "swap") {
    return (
      <div className="text-[11px] text-accent-azure/80 flex items-center gap-1.5">
        <span className="text-accent-azure flex-shrink-0">~</span>
        <span>{entry.before} <ArrowRight className="h-2.5 w-2.5 inline text-accent-azure/60" /> {entry.after}</span>
      </div>
    )
  }
  return (
    <div className="text-[11px] text-accent-azure/80 flex items-center gap-1.5">
      <span className="text-accent-azure flex-shrink-0">~</span>
      <span>
        {entry.exerciseName}
        {entry.field && (
          <span className="text-muted-foreground">
            {" "}{entry.field}: {entry.before} <ArrowRight className="h-2.5 w-2.5 inline text-accent-azure/60" /> {entry.after}
          </span>
        )}
      </span>
    </div>
  )
}

// ============================================
// PREVIEW CARD
// ============================================

export function RoutineVersionPreviewCard({
  proposal,
  onApply,
  onDismiss,
  applying,
  appliedVersion,
}: {
  proposal: RoutineProposal
  onApply?: () => void
  onDismiss?: () => void
  applying?: boolean
  appliedVersion?: { versionNumber: number }
}) {
  const diff = proposal.diff || []
  const dailyDiff = proposal.dailyRoutineDiff || []

  const grouped = diff.reduce<Record<string, Record<string, RoutineChangeDiffEntry[]>>>((acc, entry) => {
    const dayObj = acc[entry.day] ?? (acc[entry.day] = {})
    const sectionArr = dayObj[entry.section] ?? (dayObj[entry.section] = [])
    sectionArr.push(entry)
    return acc
  }, {})

  const dailyGrouped = dailyDiff.reduce<Record<string, DailyRoutineChangeDiffEntry[]>>((acc, entry) => {
    const arr = acc[entry.routineType] ?? (acc[entry.routineType] = [])
    arr.push(entry)
    return acc
  }, {})

  if (appliedVersion) {
    return (
      <div className="my-2 rounded-lg border border-accent-sage/30 bg-accent-sage/5 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Check className="h-3.5 w-3.5 text-accent-sage" />
          <span className="text-xs font-medium text-accent-sage">
            Draft v{appliedVersion.versionNumber} created
          </span>
          <span className="text-[11px] text-muted-foreground ml-1">
            {proposal.commitMessage}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="my-2 rounded-lg border border-accent-violet/30 bg-accent-violet/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-accent-violet/20 bg-accent-violet/10">
        <Dumbbell className="h-3.5 w-3.5 text-accent-violet" />
        <span className="text-xs font-semibold text-accent-violet">Proposed Routine Changes</span>
        {proposal.changesApplied != null && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {proposal.changesApplied} change{proposal.changesApplied !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        <p className="text-xs font-medium text-foreground">{proposal.commitMessage}</p>

        {/* Workout changes */}
        {Object.entries(grouped).map(([day, sections]) => (
          <div key={day} className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground capitalize">
              {day}
            </span>
            {Object.entries(sections).map(([section, entries]) => (
              <div key={`${day}-${section}`} className="space-y-0.5 ml-2">
                <span className="text-[10px] text-muted-foreground/80">
                  {SECTION_LABELS[section] || section}
                </span>
                {entries.map((entry, i) => (
                  <DiffEntryRow key={i} entry={entry} />
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Daily routine changes */}
        {Object.entries(dailyGrouped).map(([routineType, entries]) => (
          <div key={routineType} className="space-y-1">
            <div className="flex items-center gap-1.5">
              {routineType === 'morning'
                ? <Sun className="h-2.5 w-2.5 text-accent-gold" />
                : <Moon className="h-2.5 w-2.5 text-accent-violet" />
              }
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {DAILY_ROUTINE_LABELS[routineType] || routineType}
              </span>
            </div>
            <div className="space-y-0.5 ml-2">
              {entries.map((entry, i) => (
                <DiffEntryRow key={i} entry={entry} />
              ))}
            </div>
          </div>
        ))}

        {onApply && onDismiss && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs bg-accent-sage hover:bg-accent-sage/90 text-white gap-1.5"
              onClick={onApply}
              disabled={applying}
            >
              {applying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Apply Changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
              disabled={applying}
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// DISMISSED / ERROR BADGES
// ============================================

export function RoutineDismissedBadge() {
  return (
    <div className="my-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <X className="h-3 w-3" />
        <span>Proposed changes dismissed</span>
      </div>
    </div>
  )
}

export function RoutineErrorBadge({ message }: { message?: string }) {
  return (
    <div className="my-1.5 rounded-md border border-accent-rose/20 bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3 w-3" />
        <span>{message || "Failed to prepare routine changes"}</span>
      </div>
    </div>
  )
}
