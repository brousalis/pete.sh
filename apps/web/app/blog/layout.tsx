import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Blog | petehome',
    template: '%s | petehome Blog',
  },
  description:
    'Thoughts on technology, smart home automation, and software development.',
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
