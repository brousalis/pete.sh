import { SyncManager } from "@/components/sync-manager"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type React from "react"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "petehome",
  description: "petehome - Your modern smart home control center. Monitor and control your smart home devices, view statistics, manage profiles, and more.",
  generator: "petehome",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // Put font variables and antialiasing on html so they apply before hydration.
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      // Ensure a default brand so color theming is active before hydration.
      data-brand="yellow"
    >
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Suspense fallback={null}>
            {children}
            <Analytics />
            {/* Background sync for local mode - syncs data to Supabase every 30s */}
            <SyncManager interval={30000} debug={false} />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
