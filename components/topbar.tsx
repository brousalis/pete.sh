'use client'

import { Menu, Settings } from 'lucide-react'
import Link from 'next/link'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-border/50 sticky top-0 z-30 mb-6 rounded-xl border-b shadow-sm backdrop-blur-md lg:-mx-7 lg:rounded-none">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-7">
        <button
          onClick={onMenuClick}
          className="hover:bg-muted/80 focus:ring-ring/50 rounded-lg p-2 transition-colors focus:ring-2 focus:outline-none lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="text-muted-foreground size-5" />
        </button>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Settings Link */}
          <Link
            href="/settings"
            className="hover:bg-muted/80 focus:ring-ring/50 rounded-lg p-2 transition-colors focus:ring-2 focus:outline-none"
            aria-label="Open settings"
          >
            <Settings className="text-muted-foreground size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  )
}
