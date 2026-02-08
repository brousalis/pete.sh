'use client'

import type { MapleMoodRating } from '@/lib/types/maple.types'
import { MOOD_COLORS, MOOD_EMOJI, getMoodLabel } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface MapleMoodRatingProps {
  value: MapleMoodRating | null
  onChange?: (value: MapleMoodRating) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

const SIZES = {
  sm: {
    button: 'w-10 h-10',
    emoji: 'text-xl',
    label: 'text-xs',
  },
  md: {
    button: 'w-14 h-14',
    emoji: 'text-2xl',
    label: 'text-sm',
  },
  lg: {
    button: 'w-20 h-20',
    emoji: 'text-4xl',
    label: 'text-base',
  },
}

const MOODS: MapleMoodRating[] = ['happy', 'neutral', 'sad']

export function MapleMoodRatingSelector({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showLabels = false,
}: MapleMoodRatingProps) {
  const sizeStyles = SIZES[size]

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {MOODS.map((mood) => {
          const isSelected = value === mood
          const colors = MOOD_COLORS[mood]

          return (
            <motion.button
              key={mood}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(mood)}
              className={cn(
                'relative flex items-center justify-center rounded-full border-2 transition-all',
                sizeStyles.button,
                isSelected
                  ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-offset-background`
                  : 'border-border bg-background hover:border-muted-foreground/50',
                isSelected && mood === 'happy' && 'ring-green-500/50',
                isSelected && mood === 'neutral' && 'ring-yellow-500/50',
                isSelected && mood === 'sad' && 'ring-orange-500/50',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              whileHover={disabled ? {} : { scale: 1.1 }}
              whileTap={disabled ? {} : { scale: 0.95 }}
              aria-label={getMoodLabel(mood)}
              aria-pressed={isSelected}
            >
              <span className={cn(sizeStyles.emoji, !isSelected && 'grayscale opacity-50')}>
                {MOOD_EMOJI[mood]}
              </span>
              {isSelected && (
                <motion.div
                  className={cn(
                    'absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full',
                    mood === 'happy' && 'bg-green-500',
                    mood === 'neutral' && 'bg-yellow-500',
                    mood === 'sad' && 'bg-orange-500'
                  )}
                  layoutId="mood-indicator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
      {showLabels && value && (
        <motion.p
          className={cn('font-medium', sizeStyles.label, MOOD_COLORS[value].text)}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {getMoodLabel(value)}
        </motion.p>
      )}
    </div>
  )
}

// Display-only mood badge
export function MapleMoodBadge({
  mood,
  size = 'md',
  showLabel = false,
}: {
  mood: MapleMoodRating | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  if (!mood) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full border border-dashed border-muted-foreground/30 bg-muted/30',
          SIZES[size].button
        )}
      >
        <span className={cn('opacity-30', SIZES[size].emoji)}>?</span>
      </div>
    )
  }

  const colors = MOOD_COLORS[mood]

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-2',
          SIZES[size].button,
          colors.bg,
          colors.border
        )}
      >
        <span className={SIZES[size].emoji}>{MOOD_EMOJI[mood]}</span>
      </div>
      {showLabel && (
        <span className={cn('font-medium', SIZES[size].label, colors.text)}>
          {getMoodLabel(mood)}
        </span>
      )}
    </div>
  )
}

// Compact inline mood display
export function MapleMoodInline({
  mood,
  className,
}: {
  mood: MapleMoodRating | null
  className?: string
}) {
  if (!mood) {
    return <span className={cn('text-muted-foreground', className)}>No rating</span>
  }

  const colors = MOOD_COLORS[mood]

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="text-lg">{MOOD_EMOJI[mood]}</span>
      <span className={cn('text-sm font-medium', colors.text)}>{getMoodLabel(mood)}</span>
    </span>
  )
}
