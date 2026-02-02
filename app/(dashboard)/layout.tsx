'use client'

import { PageTransitionProvider } from '@/components/page-transition'
import { TopNavigation } from '@/components/top-navigation'
import { usePathname } from 'next/navigation'
import type React from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isDeckRoute = pathname === '/deck'

  if (isDeckRoute) {
    // Deck route: full screen, no padding, no scrolling
    return (
      <div className="bg-background fixed inset-0 flex h-screen w-screen flex-col overflow-hidden">
        <div className="bg-muted flex h-full w-full flex-1 overflow-hidden">
          <PageTransitionProvider className="flex h-full w-full flex-1">
            {children}
          </PageTransitionProvider>
        </div>
      </div>
    )
  }

  // Regular dashboard route: full height layout with scrollable content
  return (
    <div className="bg-background fixed inset-0 flex flex-col overflow-hidden">
      {/* Outer container with padding */}
      <div className="flex min-h-0 flex-1 flex-col p-2 pb-0 sm:p-3 sm:pb-0 md:pb-3">
        {/* Card wrapper - flex column to contain nav + content + footer */}
        <div className="bg-card ring-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl shadow-sm ring-1 sm:rounded-3xl">
          {/* Top Navigation - fixed height, shrink-0 to prevent compression */}
          <div className="shrink-0">
            <TopNavigation />
          </div>

          {/* Main Content - scrollable, hide scrollbar for cleaner look */}
          <main className="scrollbar-hide bg-muted relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:px-6 md:py-6">
            <PageTransitionProvider className="h-full">
              {children}
            </PageTransitionProvider>
          </main>

          {/* Footer - constrains layout, visible on tablet and below */}
          <footer className="bg-muted border-border/20 flex h-6 shrink-0 items-center justify-center border-t md:hidden">
            <span className="text-muted-foreground/40 text-[9px]">
              petehome
            </span>
          </footer>
        </div>
      </div>

      {/* Mobile Bottom Navigation - persistent footer on small screens */}
      {/* <MobileBottomNavigation /> */}
    </div>
  )
}
