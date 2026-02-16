'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { VaultNoteSummary } from '@/lib/types/vault.types'
import { FileText, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VaultNoteCard } from './vault-note-card'

interface VaultSidebarProps {
  notes: VaultNoteSummary[]
  selectedNoteId: string | null
  tags: Array<{ tag: string; count: number }>
  loading: boolean
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onSearchChange: (query: string) => void
  onTagFilter: (tag: string | null) => void
  activeTag: string | null
}

export function VaultSidebar({
  notes,
  selectedNoteId,
  tags,
  loading,
  onSelectNote,
  onCreateNote,
  onSearchChange,
  onTagFilter,
  activeTag,
}: VaultSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        onSearchChange(value)
      }, 300)
    },
    [onSearchChange]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    onSearchChange('')
    searchRef.current?.focus()
  }, [onSearchChange])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="space-y-3 p-3 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Vault</h2>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCreateNote}
              title="New note (Ctrl+N)"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search notes..."
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="scrollbar-hide flex gap-1 overflow-x-auto">
            {activeTag && (
              <Badge
                variant="outline"
                className="cursor-pointer gap-1 px-1.5 py-0 text-[10px] shrink-0"
                onClick={() => onTagFilter(null)}
              >
                {activeTag}
                <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {!activeTag &&
              tags.slice(0, 10).map(({ tag, count }) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer px-1.5 py-0 text-[10px] shrink-0 hover:bg-accent"
                  onClick={() => onTagFilter(tag)}
                >
                  {tag}
                  <span className="text-muted-foreground ml-0.5">{count}</span>
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* Note list */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-3">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse space-y-2 rounded-lg p-3"
              >
                <div className="bg-muted h-4 w-3/4 rounded" />
                <div className="bg-muted h-3 w-full rounded" />
                <div className="bg-muted h-3 w-1/2 rounded" />
              </div>
            ))
          ) : notes.length === 0 ? (
            // Empty state
            <div className="px-3 py-12 text-center">
              <FileText className="text-muted-foreground/40 mx-auto h-8 w-8" />
              <p className="text-muted-foreground mt-3 text-xs">
                {searchQuery || activeTag
                  ? 'No notes match your search'
                  : 'No notes yet'}
              </p>
              {!searchQuery && !activeTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={onCreateNote}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Create your first note
                </Button>
              )}
            </div>
          ) : (
            notes.map(note => (
              <VaultNoteCard
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                onClick={() => onSelectNote(note.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
