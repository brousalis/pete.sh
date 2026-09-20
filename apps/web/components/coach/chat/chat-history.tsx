'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { CoachConversationListItem } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

import { formatRelativeTime, groupThreads, threadTitle } from './chat-lib'

export function ChatHistory({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
  compact = false,
}: {
  threads: CoachConversationListItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  compact?: boolean
}) {
  const groups = groupThreads(threads)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b border-border/80',
          compact ? 'px-1 py-2.5' : 'px-3 py-2.5'
        )}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Sessions
        </p>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Start a new session"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4" aria-label="Past sessions">
        {threads.length === 0 ? (
          <p className="px-2.5 pt-6 text-sm leading-relaxed text-muted-foreground">
            Nothing here yet. The first question you ask becomes a session you can reopen.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((thread) => {
                  const active = thread.id === activeId
                  return (
                    <li key={thread.id}>
                      <div
                        className={cn(
                          'group flex items-stretch rounded-lg transition-colors',
                          active ? 'bg-foreground/[0.06]' : 'hover:bg-muted/80'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(thread.id)}
                          className="min-w-0 flex-1 px-2.5 py-2 text-left"
                        >
                          <p
                            className={cn(
                              'truncate text-sm',
                              active ? 'font-medium text-foreground' : 'text-foreground/90'
                            )}
                          >
                            {threadTitle(thread)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatRelativeTime(thread.last_message_at ?? thread.created_at)}
                            {thread.message_count
                              ? ` · ${thread.message_count} ${thread.message_count === 1 ? 'note' : 'notes'}`
                              : ''}
                          </p>
                        </button>
                        {pendingDelete === thread.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingDelete(null)
                              onDelete(thread.id)
                            }}
                            className="me-1 self-center rounded-md px-2 py-1 text-[11px] text-accent-rose hover:bg-background"
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(thread.id)}
                            className="me-1 inline-flex size-8 shrink-0 items-center justify-center self-center rounded-md text-muted-foreground opacity-80 transition-opacity hover:bg-background hover:text-accent-rose md:opacity-0 md:group-hover:opacity-100"
                            aria-label={`Delete ${threadTitle(thread)}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </div>
  )
}
