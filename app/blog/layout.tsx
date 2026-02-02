import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Blog | Petehome',
    template: '%s | Petehome Blog',
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
