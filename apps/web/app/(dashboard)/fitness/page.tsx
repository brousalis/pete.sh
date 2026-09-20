'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { FitnessPageContent } from '@/components/dashboard/fitness-page-content'

/**
 * Legacy fitness view.
 *
 * PeteCoach at /coach is now the source of truth for training: it holds the
 * periodised plan, the Injury Guard, and readiness. This page stays during
 * the compatibility window because the gym routine history and the exercise
 * logs still live here and are worth reading. It will be retired once that
 * history has been fully absorbed into coach_plan_history.
 */
export default function FitnessPage() {
  return (
    <>
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <Link
          href="/coach"
          className="mx-auto flex max-w-4xl items-center justify-between gap-3 text-sm"
        >
          <span className="text-muted-foreground">
            Training has moved to <span className="font-medium text-foreground">PeteCoach</span>.
            This page keeps the older gym routine and exercise history.
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium">
            Open PeteCoach
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      </div>
      <FitnessPageContent embedded={false} />
    </>
  )
}
