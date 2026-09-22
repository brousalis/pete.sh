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
  /** @deprecated denser layout is always used; kept for call-site compat */
  compact?: boolean
  onCollapse?: () => void
}) {
  const groups = groupThreads(threads)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-2.5 py-2">
        <p className="t-micro text-ink-3">Sessions</p>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-6 items-center gap-1 rounded-control px-1.5 t-label text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
        >
          <Plus className="size-3" />
          New
        </button>
      </div>

      <nav
        className={cn('min-h-0 flex-1 overflow-y-auto px-1 pb-2', compact && 'max-h-[min(28rem,70vh)]')}
        aria-label="Past sessions"
      >
        {threads.length === 0 ? (
          <p className="px-2 pt-4 t-label leading-relaxed text-ink-3">
            Nothing yet. Your first question becomes a session.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-2.5 pt-1.5">
              <p className="px-2 pb-1 t-micro text-ink-3/70">{group.label}</p>
              <ul className="space-y-px">
                {group.items.map((thread) => {
                  const active = thread.id === activeId
                  return (
                    <li key={thread.id}>
                      <div
                        className={cn(
                          'group flex items-stretch rounded-control transition-colors',
                          active ? 'bg-surface-2' : 'hover:bg-surface-2/70'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(thread.id)}
                          className="min-w-0 flex-1 px-2 py-1.5 text-left"
                        >
                          <p
                            className={cn(
                              'truncate t-label leading-snug',
                              active ? 'font-semibold text-ink-1' : 'text-ink-1/90'
                            )}
                          >
                            {threadTitle(thread)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-ink-3">
                            {formatRelativeTime(thread.last_message_at ?? thread.created_at)}
                            {thread.message_count ? ` · ${thread.message_count}` : ''}
                          </p>
                        </button>
                        {pendingDelete === thread.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingDelete(null)
                              onDelete(thread.id)
                            }}
                            className="me-1 self-center rounded px-1.5 py-0.5 text-[10px] text-tone-alert hover:bg-surface-1"
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(thread.id)}
                            className="me-0.5 inline-flex size-6 shrink-0 items-center justify-center self-center rounded text-ink-3 opacity-0 transition-opacity hover:bg-surface-1 hover:text-tone-alert group-hover:opacity-100"
                            aria-label={`Delete ${threadTitle(thread)}`}
                          >
                            <Trash2 className="size-3" />
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
