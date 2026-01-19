'use client'

import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const isDeckRoute = pathname === '/deck'

  if (isDeckRoute) {
    // Deck route: full screen, no padding, no scrolling
    return (
      <div className="bg-background fixed inset-0 flex h-screen w-screen flex-col overflow-hidden">
        <div className="bg-muted flex h-full w-full flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  // Regular dashboard route: with padding and scrolling
  return (
    <div className="bg-background">
      <div className="mx-auto px-2 py-3 sm:px-4">
        <div className="bg-card ring-border overflow-hidden rounded-3xl shadow-sm ring-1">
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Mobile Header */}
          <div className="bg-card border-border/50 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="gap-2"
            >
              <Menu className="size-5 pt-1" />
              {/* <span className="font-semibold">Menu</span> */}
            </Button>
            <div className="from-brand via-brand/90 to-brand bg-gradient-to-r bg-clip-text text-lg font-bold">
              petehome
            </div>
            <div className="w-[73px]"></div> {/* Spacer for centering */}
          </div>

          <div className="flex h-[calc(95vh-57px)] lg:h-[95vh]">
            <div
              className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:w-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} `}
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <main className="bg-muted w-full flex-1 overflow-auto rounded-b-3xl p-3 pb-20 sm:p-5 md:px-7 md:py-7 lg:w-auto lg:rounded-r-3xl lg:rounded-bl-none lg:pb-7 xl:pt-1 xl:pb-7">
              {children}
            </main>
          </div>
        </div>
      </div>
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
