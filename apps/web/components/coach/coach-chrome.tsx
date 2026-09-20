'use client'

import { usePathname } from 'next/navigation'

import { CoachNav } from '@/components/coach/coach-nav'
import { cn } from '@/lib/utils'

/**
 * Chat is a workspace, not a page inside a scrolling column. Other coach
 * surfaces keep the padded card stack.
 */
export function CoachChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChat = pathname.startsWith('/coach/chat')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CoachNav />
      <main
        className={cn(
          'min-h-0 flex-1',
          isChat
            ? 'flex flex-col overflow-hidden pb-16 md:pb-0'
            : 'overflow-y-auto pb-20 md:pb-6'
        )}
      >
        {children}
      </main>
    </div>
  )
}
