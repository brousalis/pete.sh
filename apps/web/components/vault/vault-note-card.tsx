'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VaultNoteSummary } from '@/lib/types/vault.types'
import { Pin } from 'lucide-react'

interface VaultNoteCardProps {
  note: VaultNoteSummary
  isSelected: boolean
  onClick: () => void
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function VaultNoteCard({
  note,
  isSelected,
  onClick,
}: VaultNoteCardProps) {
  const displayTags = note.tags.slice(0, 3)
  const extraTagCount = note.tags.length - 3

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full cursor-pointer rounded-lg border p-3 text-left transition-all',
        'hover:bg-accent/50',
        isSelected
          ? 'border-brand/30 bg-brand/5 ring-brand/20 ring-1'
          : 'border-transparent bg-transparent'
      )}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <h3
          className={cn(
            'flex-1 truncate text-sm font-medium',
            isSelected ? 'text-foreground' : 'text-foreground/90'
          )}
        >
          {note.title || 'Untitled'}
        </h3>
        {note.isPinned && (
          <Pin className="text-brand mt-0.5 h-3 w-3 shrink-0 rotate-45" />
        )}
      </div>

      {/* Content preview */}
      {note.contentPreview && (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
          {note.contentPreview}
        </p>
      )}

      {/* Footer: tags + timestamp */}
      <div className="mt-2 flex items-center gap-2">
        {displayTags.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {displayTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="max-w-[80px] truncate px-1.5 py-0 text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {extraTagCount > 0 && (
              <span className="text-muted-foreground text-[10px]">
                +{extraTagCount}
              </span>
            )}
          </div>
        )}
        <span className="text-muted-foreground shrink-0 text-[10px]">
          {formatRelativeTime(note.updatedAt)}
        </span>
      </div>
    </button>
  )
}
