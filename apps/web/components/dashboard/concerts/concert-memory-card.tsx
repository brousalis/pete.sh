'use client'

import { Button } from '@/components/ui/button'
import type { Concert } from '@/lib/types/concerts.types'
import { format, parseISO } from 'date-fns'
import { Download, Share2 } from 'lucide-react'
import { useCallback, useRef } from 'react'

interface ConcertMemoryCardProps {
  concert: Concert
  className?: string
}

export function ConcertMemoryCard({ concert, className }: ConcertMemoryCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateCard = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 1080
    const height = 1350
    canvas.width = width
    canvas.height = height

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#1a1a2e')
    gradient.addColorStop(0.5, '#16213e')
    gradient.addColorStop(1, '#0f3460')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Load cover image if available
    const coverUrl =
      concert.cover_image ||
      concert.photos?.find((p) => p.is_cover)?.storage_url ||
      concert.photos?.[0]?.storage_url

    if (coverUrl) {
      try {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = coverUrl
        })

        // Draw image with overlay
        const imgAspect = img.width / img.height
        const drawWidth = width
        const drawHeight = drawWidth / imgAspect
        const y = Math.max(0, (height * 0.6 - drawHeight) / 2)

        ctx.globalAlpha = 0.6
        ctx.drawImage(img, 0, y, drawWidth, drawHeight)
        ctx.globalAlpha = 1

        // Gradient overlay
        const overlay = ctx.createLinearGradient(0, 0, 0, height)
        overlay.addColorStop(0, 'rgba(0,0,0,0.3)')
        overlay.addColorStop(0.5, 'rgba(0,0,0,0.5)')
        overlay.addColorStop(1, 'rgba(0,0,0,0.85)')
        ctx.fillStyle = overlay
        ctx.fillRect(0, 0, width, height)
      } catch {
        // If image fails to load, continue without it
      }
    }

    // Decorative line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, height - 450)
    ctx.lineTo(width - 80, height - 450)
    ctx.stroke()

    // Content area
    const textX = 80
    let textY = height - 400

    // Date
    const eventDate = parseISO(concert.event_date)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '500 28px system-ui, -apple-system, sans-serif'
    ctx.fillText(
      format(eventDate, 'EEEE, MMMM d, yyyy').toUpperCase(),
      textX,
      textY
    )
    textY += 60

    // Artist name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif'
    const artistLines = wrapText(ctx, concert.artist_name, width - 160)
    for (const line of artistLines) {
      ctx.fillText(line, textX, textY)
      textY += 72
    }
    textY += 10

    // Venue
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '400 32px system-ui, -apple-system, sans-serif'
    ctx.fillText(concert.venue_name, textX, textY)
    textY += 50

    // Tour name
    if (concert.tour_name) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = 'italic 26px system-ui, -apple-system, sans-serif'
      ctx.fillText(concert.tour_name, textX, textY)
      textY += 45
    }

    // Rating stars
    if (concert.rating) {
      ctx.fillStyle = '#fbbf24'
      ctx.font = '36px system-ui, -apple-system, sans-serif'
      const stars = '★'.repeat(concert.rating) + '☆'.repeat(5 - concert.rating)
      ctx.fillText(stars, textX, textY)
    }

    // Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.font = '400 18px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('petehome', width - 80, height - 40)
    ctx.textAlign = 'left'

    // Download
    const link = document.createElement('a')
    link.download = `${concert.artist_name.toLowerCase().replace(/\s+/g, '-')}-${concert.event_date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [concert])

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="hidden" />
      <Button
        variant="outline"
        size="sm"
        onClick={generateCard}
        className="gap-2"
      >
        <Download className="size-4" />
        Memory Card
      </Button>
    </div>
  )
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}
