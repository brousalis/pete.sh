'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

import PtPlayerInner from './pt-player-inner'

export default function PtPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-surface-0">
          <Loader2 className="size-5 animate-spin text-ink-3" />
        </div>
      }
    >
      <PtPlayerInner />
    </Suspense>
  )
}
