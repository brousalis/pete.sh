'use client'

import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/**
 * Desk (`/coach`) is a fixed workspace. Onboard, tests, and other secondary
 * routes scroll inside the same shell without the old tab bar.
 */
export function CoachChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const deskWorkspace = pathname === '/coach'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <main
        className={cn(
          'min-h-0 flex-1',
          deskWorkspace ? 'overflow-hidden' : 'overflow-y-auto bg-surface-0'
        )}
      >
        {children}
      </main>
    </div>
  )
}
