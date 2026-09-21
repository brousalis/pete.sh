'use client'

import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import type React from 'react'

/**
 * Thin shell for petehome routes. Old dashboard chrome (assistant modal,
 * top nav, SyncManager-driven home features) has been removed.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isCoachChat = pathname.startsWith('/coach/chat')

  return (
    <div className="bg-background fixed inset-0 flex flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <main
            className={cn(
              'scrollbar-hide relative min-h-0 flex-1 overflow-x-hidden',
              isCoachChat
                ? 'overflow-hidden bg-background p-0'
                : 'bg-muted overflow-y-auto p-3 sm:p-5 md:px-6 md:py-6'
            )}
          >
            <div className="h-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
