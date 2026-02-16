'use client'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { useToast } from '@/hooks/use-toast'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api/client'
import type {
  VaultNote,
  VaultNoteSummary,
} from '@/lib/types/vault.types'
import type { JSONContent } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VaultEditor } from './vault-editor'
import { VaultSidebar } from './vault-sidebar'

interface VaultViewProps {
  isMobile?: boolean
}

export function VaultView({ isMobile = false }: VaultViewProps) {
  const { toast } = useToast()
  const [notes, setNotes] = useState<VaultNoteSummary[]>([])
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<VaultNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteLoading, setNoteLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [mobileShowEditor, setMobileShowEditor] = useState(false)

  const fetchNotesRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch notes list
  const fetchNotes = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true)

      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('search', searchQuery)
        if (activeTag) params.set('tag', activeTag)
        params.set('pageSize', '200')

        const response = await apiGet<{
          notes: VaultNoteSummary[]
          total: number
        }>(`/api/vault/notes?${params.toString()}`)

        if (response.success && response.data) {
          setNotes(response.data.notes)
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error)
      } finally {
        setLoading(false)
      }
    },
    [searchQuery, activeTag]
  )

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await apiGet<{
        tags: Array<{ tag: string; count: number }>
      }>('/api/vault/tags')

      if (response.success && response.data) {
        setTags(response.data.tags)
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchNotes(true)
    fetchTags()
  }, [fetchNotes, fetchTags])

  // Fetch full note when selection changes
  const fetchNote = useCallback(async (id: string) => {
    setNoteLoading(true)
    try {
      const response = await apiGet<VaultNote>(`/api/vault/notes/${id}`)
      if (response.success && response.data) {
        setSelectedNote(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch note:', error)
    } finally {
      setNoteLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedNoteId) {
      fetchNote(selectedNoteId)
    } else {
      setSelectedNote(null)
    }
  }, [selectedNoteId, fetchNote])

  // Select note
  const handleSelectNote = useCallback(
    (id: string) => {
      setSelectedNoteId(id)
      if (isMobile) {
        setMobileShowEditor(true)
      }
    },
    [isMobile]
  )

  // Create note
  const handleCreateNote = useCallback(async () => {
    try {
      const response = await apiPost<VaultNote>('/api/vault/notes', {})

      if (response.success && response.data) {
        setSelectedNoteId(response.data.id)
        setSelectedNote(response.data)

        // Refresh the list
        await fetchNotes()

        if (isMobile) {
          setMobileShowEditor(true)
        }
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create note',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create note',
        variant: 'destructive',
      })
    }
  }, [fetchNotes, isMobile, toast])

  // Save note (called by editor's auto-save)
  const handleSaveNote = useCallback(
    async (
      id: string,
      data: {
        title?: string
        content?: JSONContent
        contentHtml?: string
        tags?: string[]
        sourceUrl?: string | null
      }
    ) => {
      const response = await apiPut<VaultNote>(`/api/vault/notes/${id}`, data)

      if (!response.success) {
        throw new Error(response.error || 'Failed to save note')
      }

      // Update the note in our list without a full refetch (optimistic)
      setNotes(prev =>
        prev.map(n => {
          if (n.id !== id) return n
          const contentPreview = data.contentHtml
            ? data.contentHtml
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 120)
            : n.contentPreview
          return {
            ...n,
            title: data.title ?? n.title,
            tags: data.tags ?? n.tags,
            contentPreview,
            updatedAt: new Date().toISOString(),
          }
        })
      )

      // Debounced tag refresh
      if (fetchNotesRef.current) clearTimeout(fetchNotesRef.current)
      fetchNotesRef.current = setTimeout(() => fetchTags(), 3000)
    },
    [fetchTags]
  )

  // Delete note
  const handleDeleteNote = useCallback(
    async (id: string) => {
      const response = await apiDelete(`/api/vault/notes/${id}`)

      if (response.success) {
        // Remove from list optimistically
        setNotes(prev => prev.filter(n => n.id !== id))
        setSelectedNoteId(null)
        setSelectedNote(null)

        if (isMobile) {
          setMobileShowEditor(false)
        }

        toast({ title: 'Deleted', description: 'Note has been deleted.' })
        fetchTags()
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete note',
          variant: 'destructive',
        })
      }
    },
    [isMobile, toast, fetchTags]
  )

  // Toggle pin
  const handleTogglePin = useCallback(
    async (id: string) => {
      const note = notes.find(n => n.id === id)
      if (!note) return

      // Optimistic update
      const newPinned = !note.isPinned
      setNotes(prev =>
        prev.map(n => (n.id === id ? { ...n, isPinned: newPinned } : n))
      )
      if (selectedNote?.id === id) {
        setSelectedNote(prev =>
          prev ? { ...prev, isPinned: newPinned } : prev
        )
      }

      const response = await apiPut(`/api/vault/notes/${id}`, {
        isPinned: newPinned,
      })

      if (!response.success) {
        // Revert on failure
        setNotes(prev =>
          prev.map(n => (n.id === id ? { ...n, isPinned: !newPinned } : n))
        )
        toast({
          title: 'Error',
          description: 'Failed to update pin state',
          variant: 'destructive',
        })
      }
    },
    [notes, selectedNote, toast]
  )

  // Search change handler
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Tag filter handler
  const handleTagFilter = useCallback((tag: string | null) => {
    setActiveTag(tag)
  }, [])

  // Mobile back handler
  const handleMobileBack = useCallback(() => {
    setMobileShowEditor(false)
  }, [])

  // Keyboard shortcut: Ctrl+N to create, Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        // Only handle if vault is focused (not in another input outside vault)
        e.preventDefault()
        handleCreateNote()
      }
      if (e.key === 'Escape' && selectedNoteId) {
        setSelectedNoteId(null)
        setSelectedNote(null)
        if (isMobile) setMobileShowEditor(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCreateNote, selectedNoteId, isMobile])

  // Mobile layout: show either list or editor
  if (isMobile) {
    if (mobileShowEditor && selectedNoteId) {
      return (
        <div className="bg-card h-[calc(100vh-220px)] rounded-xl border">
          <VaultEditor
            note={selectedNote}
            loading={noteLoading}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onBack={handleMobileBack}
            showBackButton
          />
        </div>
      )
    }

    return (
      <div className="bg-card h-[calc(100vh-220px)] rounded-xl border">
        <VaultSidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          tags={tags}
          loading={loading}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onSearchChange={handleSearchChange}
          onTagFilter={handleTagFilter}
          activeTag={activeTag}
        />
      </div>
    )
  }

  // Desktop layout: resizable split pane
  return (
    <div className="bg-card h-[calc(100vh-220px)] overflow-hidden rounded-xl border">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
          <VaultSidebar
            notes={notes}
            selectedNoteId={selectedNoteId}
            tags={tags}
            loading={loading}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onSearchChange={handleSearchChange}
            onTagFilter={handleTagFilter}
            activeTag={activeTag}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70}>
          <VaultEditor
            note={selectedNote}
            loading={noteLoading}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onTogglePin={handleTogglePin}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
