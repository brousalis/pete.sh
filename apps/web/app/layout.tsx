import { Providers } from '@/components/providers'
import { SyncManager } from '@/components/sync-manager'
import { Analytics } from '@vercel/analytics/next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'petehome',
  description: 'petehome - because pete be home sometimes',
  generator: 'petehome',
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
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      data-brand="yellow"
    >
      <body className="font-sans">
        <Providers>
          <Suspense fallback={null}>
            {children}
            <Analytics />
            <SyncManager interval={30000} debug={false} />
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
