'use client'

import { Suspense } from 'react'

import { ChatShell, ChatShellFallback } from '@/components/coach/chat/chat-shell'

/**
 * Coaching notebook. Threads persist, resume, and read as sessions rather
 * than a disposable chatbot. The conversation id is owned by the client so
 * leaving the page no longer starts a new thread on the next send.
 */
export default function CoachChatPage() {
  return (
    <Suspense fallback={<ChatShellFallback />}>
      <ChatShell />
    </Suspense>
  )
}
