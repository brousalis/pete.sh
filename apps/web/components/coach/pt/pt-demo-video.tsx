'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Muted looping YouTube demo. Remounts the iframe every loopSeconds to
 * approximate a 30s clip without the IFrame API.
 */
export function PtDemoVideo({
  youtubeId,
  startSeconds = 0,
  loopSeconds = 30,
  className,
}: {
  youtubeId: string | null | undefined
  startSeconds?: number
  loopSeconds?: number
  className?: string
}) {
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!youtubeId) return
    const ms = Math.max(8, loopSeconds) * 1000
    const timer = window.setInterval(() => setNonce((n) => n + 1), ms)
    return () => window.clearInterval(timer)
  }, [youtubeId, loopSeconds])

  if (!youtubeId) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-surface-2 text-ink-3 t-label',
          className
        )}
      >
        No demo clip
      </div>
    )
  }

  const src = `https://www.youtube-nocookie.com/embed/${youtubeId}?start=${startSeconds}&autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${youtubeId}`

  return (
    <div className={cn('relative overflow-hidden bg-black', className)}>
      <iframe
        key={`${youtubeId}-${nonce}`}
        title="Exercise demo"
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        className="absolute inset-0 size-full border-0"
      />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  )
}
