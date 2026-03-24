import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Website Homework | Aeros Consulting',
  description:
    'Section-by-section guide to refining the copy, content, and credibility of the Aeros website.',
  robots: { index: false, follow: false },
}

export default function HomeworkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
