'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './theme-provider'

interface ProvidersProps {
  children: ReactNode
}

/** Client-side providers for petehome. */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
