'use client'

import type { ReactNode } from 'react'
import { ConnectivityProvider } from './connectivity-provider'
import { SettingsProvider } from './settings-provider'
import { ThemeProvider } from './theme-provider'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Client-side providers wrapper
 *
 * Wraps the app with all necessary providers:
 * - ThemeProvider: Dark/light mode theming
 * - SettingsProvider: App settings from Supabase
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
      <SettingsProvider>
        <ConnectivityProvider>{children}</ConnectivityProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
