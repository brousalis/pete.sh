'use client'

import type React from 'react'

/**
 * Fixed viewport for the petehome PWA. The coaching desk is edge-to-edge;
 * onboard / tests scroll inside the same shell.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background fixed inset-0 flex flex-col">
      <main className="scrollbar-hide relative min-h-0 flex-1 overflow-hidden bg-background">
        <div className="h-full">{children}</div>
      </main>
    </div>
  )
}
