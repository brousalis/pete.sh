"use client"

import type { ReactNode } from "react"
import { ConnectivityProvider } from "./connectivity-provider"
import { ThemeProvider } from "./theme-provider"

interface ProvidersProps {
  children: ReactNode
}

/**
 * Client-side providers wrapper
 * 
 * Wraps the app with all necessary providers:
 * - ThemeProvider: Dark/light mode theming
 * - ConnectivityProvider: Dynamic local/production mode detection
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <ConnectivityProvider>
        {children}
      </ConnectivityProvider>
    </ThemeProvider>
  )
}
