"use client"

/**
 * Shared RoutineVersionPreviewCard used by both the AI Coach panel
 * and the dedicated /fitness/coach page.
 */

import { Button } from "@/components/ui/button"
import type { RoutineChange } from "@/lib/types/ai-coach.types"
import type { RoutineChangeDiffEntry, ProgressiveOverloadEntry } from "@/lib/utils/routine-change-utils"
import {
    AlertTriangle,
    ArrowRight,
    Check,
    Dumbbell,
    Loader2,
    Minus,
    Plus,
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
  diff?: RoutineChangeDiffEntry[]
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

  const grouped = diff.reduce<Record<string, Record<string, RoutineChangeDiffEntry[]>>>((acc, entry) => {
    const dayObj = acc[entry.day] ?? (acc[entry.day] = {})
    const sectionArr = dayObj[entry.section] ?? (dayObj[entry.section] = [])
    sectionArr.push(entry)
    return acc
  }, {})

  if (appliedVersion) {
    return (
      <div className="my-2 rounded-lg border border-green-500/30 bg-green-500/5 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Check className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs font-medium text-green-300">
            Draft v{appliedVersion.versionNumber} created
          </span>
          <span className="text-[11px] text-white/40 ml-1">
            {proposal.commitMessage}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="my-2 rounded-lg border border-purple-500/30 bg-purple-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/20 bg-purple-500/10">
        <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs font-semibold text-purple-300">Proposed Routine Changes</span>
        {proposal.changesApplied != null && (
          <span className="text-[10px] text-white/40 ml-auto">
            {proposal.changesApplied} change{proposal.changesApplied !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        <p className="text-xs font-medium text-white/90">{proposal.commitMessage}</p>

        {Object.entries(grouped).map(([day, sections]) => (
          <div key={day} className="space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 capitalize">
              {day}
            </span>
            {Object.entries(sections).map(([section, entries]) => (
              <div key={`${day}-${section}`} className="space-y-0.5 ml-2">
                <span className="text-[10px] text-white/30">
                  {SECTION_LABELS[section] || section}
                </span>
                {entries.map((entry, i) => {
                  if (entry.action === "add") {
                    return (
                      <div key={i} className="text-[11px] text-green-300/80 flex items-center gap-1.5">
                        <Plus className="h-2.5 w-2.5 text-green-400 flex-shrink-0" />
                        <span>
                          {entry.exerciseName}
                          {entry.after && <span className="text-white/40"> — {entry.after}</span>}
                        </span>
                      </div>
                    )
                  }
                  if (entry.action === "remove") {
                    return (
                      <div key={i} className="text-[11px] text-red-300/80 flex items-center gap-1.5 line-through">
                        <Minus className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />
                        <span>{entry.exerciseName}</span>
                      </div>
                    )
                  }
                  if (entry.action === "swap") {
                    return (
                      <div key={i} className="text-[11px] text-blue-300/80 flex items-center gap-1.5">
                        <span className="text-blue-400 flex-shrink-0">~</span>
                        <span>{entry.before} <ArrowRight className="h-2.5 w-2.5 inline text-blue-400/60" /> {entry.after}</span>
                      </div>
                    )
                  }
                  return (
                    <div key={i} className="text-[11px] text-blue-300/80 flex items-center gap-1.5">
                      <span className="text-blue-400 flex-shrink-0">~</span>
                      <span>
                        {entry.exerciseName}
                        {entry.field && (
                          <span className="text-white/40">
                            {" "}{entry.field}: {entry.before} <ArrowRight className="h-2.5 w-2.5 inline text-blue-400/60" /> {entry.after}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}

        {onApply && onDismiss && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5"
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
              className="h-7 text-xs border-white/10 text-white/60 hover:text-white"
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
    <div className="my-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-white/40">
        <X className="h-3 w-3" />
        <span>Proposed changes dismissed</span>
      </div>
    </div>
  )
}

export function RoutineErrorBadge({ message }: { message?: string }) {
  return (
    <div className="my-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3 w-3" />
        <span>{message || "Failed to prepare routine changes"}</span>
      </div>
    </div>
  )
}
