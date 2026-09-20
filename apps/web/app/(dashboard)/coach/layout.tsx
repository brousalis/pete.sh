import type { Metadata } from 'next'

import { CoachChrome } from '@/components/coach/coach-chrome'

export const metadata: Metadata = {
  title: 'PeteCoach',
  description: 'AI triathlon coach',
  // Medical data; keep it out of search results and link previews.
  robots: { index: false, follow: false },
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <CoachChrome>{children}</CoachChrome>
}
