'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { VaultNote } from '@/lib/types/vault.types'
import type { JSONContent } from '@tiptap/react'
import {
  ArrowLeft,
  Check,
  FileText,
  Globe,
  Loader2,
  Pin,
  PinOff,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VaultTiptapEditor } from './vault-tiptap-editor'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface VaultEditorProps {
  note: VaultNote | null
  loading: boolean
  onSave: (
    id: string,
    data: {
      title?: string
      content?: JSONContent
      contentHtml?: string
      tags?: string[]
      sourceUrl?: string | null
    }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTogglePin: (id: string) => Promise<void>
  onBack?: () => void
  showBackButton?: boolean
}

export function VaultEditor({
  note,
  loading,
  onSave,
  onDelete,
  onTogglePin,
  onBack,
  showBackButton = false,
}: VaultEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<JSONContent>({
    type: 'doc',
    content: [],
  })
  const [contentHtml, setContentHtml] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [showSourceUrl, setShowSourceUrl] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [wordCount, setWordCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const noteIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      // Only reset state if we switched to a different note
      if (noteIdRef.current !== note.id) {
        setTitle(note.title === 'Untitled' ? '' : note.title)
        setContent(note.content || { type: 'doc', content: [] })
        setContentHtml(note.contentHtml || '')
        setTags(note.tags || [])
        setSourceUrl(note.sourceUrl || '')
        setShowSourceUrl(!!note.sourceUrl)
        setSaveStatus('idle')
        noteIdRef.current = note.id

        // Focus title if it's a new untitled note
        if (note.title === 'Untitled') {
          setTimeout(() => titleRef.current?.focus(), 100)
        }
      }
    } else {
      noteIdRef.current = null
    }
  }, [note])

  // Calculate word count from HTML
  useEffect(() => {
    if (contentHtml) {
      const text = contentHtml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const words = text.split(/\s+/).filter(w => w.length > 0)
      setWordCount(words.length)
    } else {
      setWordCount(0)
    }
  }, [contentHtml])

  // Auto-save helper
  const triggerAutoSave = useCallback(
    (data: {
      title?: string
      content?: JSONContent
      contentHtml?: string
      tags?: string[]
      sourceUrl?: string | null
    }) => {
      if (!note) return

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current || !noteIdRef.current) return

        setSaveStatus('saving')
        try {
          await onSave(noteIdRef.current, data)
          if (!isMountedRef.current) return
          setSaveStatus('saved')

          savedTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setSaveStatus('idle')
          }, 2000)
        } catch {
          if (isMountedRef.current) setSaveStatus('error')
        }
      }, 1500)
    },
    [note, onSave]
  )

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // Title change with auto-save
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
      triggerAutoSave({
        title: newTitle || 'Untitled',
        content,
        contentHtml,
        tags,
        sourceUrl: sourceUrl || null,
      })
    },
    [content, contentHtml, tags, sourceUrl, triggerAutoSave]
  )

  // Content change with auto-save
  const handleContentChange = useCallback(
    (json: JSONContent, html: string) => {
      setContent(json)
      setContentHtml(html)
      triggerAutoSave({
        title: title || 'Untitled',
        content: json,
        contentHtml: html,
        tags,
        sourceUrl: sourceUrl || null,
      })
    },
    [title, tags, sourceUrl, triggerAutoSave]
  )

  // Tag management
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag]
      setTags(newTags)
      setTagInput('')
      triggerAutoSave({
        title: title || 'Untitled',
        content,
        contentHtml,
        tags: newTags,
        sourceUrl: sourceUrl || null,
      })
    }
  }, [tagInput, tags, title, content, contentHtml, sourceUrl, triggerAutoSave])

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      const newTags = tags.filter(t => t !== tagToRemove)
      setTags(newTags)
      triggerAutoSave({
        title: title || 'Untitled',
        content,
        contentHtml,
        tags: newTags,
        sourceUrl: sourceUrl || null,
      })
    },
    [tags, title, content, contentHtml, sourceUrl, triggerAutoSave]
  )

  // Source URL change with auto-save
  const handleSourceUrlChange = useCallback(
    (url: string) => {
      setSourceUrl(url)
      triggerAutoSave({
        title: title || 'Untitled',
        content,
        contentHtml,
        tags,
        sourceUrl: url || null,
      })
    },
    [title, content, contentHtml, tags, triggerAutoSave]
  )

  // Image upload handler
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/vault/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Upload failed')
    }

    return data.data.url
  }, [])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!note) return
    setIsDeleting(true)
    try {
      await onDelete(note.id)
    } finally {
      if (isMountedRef.current) setIsDeleting(false)
    }
  }, [note, onDelete])

  // Pin handler
  const handleTogglePin = useCallback(async () => {
    if (!note) return
    await onTogglePin(note.id)
  }, [note, onTogglePin])

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (note && noteIdRef.current) {
          // Force immediate save
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
          setSaveStatus('saving')
          onSave(noteIdRef.current, {
            title: title || 'Untitled',
            content,
            contentHtml,
            tags,
            sourceUrl: sourceUrl || null,
          }).then(() => {
            if (isMountedRef.current) {
              setSaveStatus('saved')
              if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
              savedTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) setSaveStatus('idle')
              }, 2000)
            }
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [note, title, content, contentHtml, tags, sourceUrl, onSave])

  // Empty state
  if (!note && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="text-muted-foreground/30 mx-auto h-12 w-12" />
          <p className="text-muted-foreground mt-4 text-sm">
            Select a note or create a new one
          </p>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            Ctrl+N to create
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editor header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {showBackButton && onBack && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Save status */}
          <div className="flex items-center gap-1.5">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
                <span className="text-muted-foreground text-xs">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-500">Save failed</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Source URL toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', showSourceUrl && 'text-brand')}
            onClick={() => setShowSourceUrl(!showSourceUrl)}
            title="Source URL"
          >
            <Globe className="h-3.5 w-3.5" />
          </Button>

          {/* Pin toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', note?.isPinned && 'text-brand')}
            onClick={handleTogglePin}
            title={note?.isPinned ? 'Unpin note' : 'Pin note'}
          >
            {note?.isPinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your note.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-3 px-6 py-4">
          {/* Title */}
          <Input
            ref={titleRef}
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="placeholder:text-muted-foreground/40 h-auto border-0 bg-transparent px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
          />

          {/* Source URL (collapsible) */}
          {showSourceUrl && (
            <div className="flex items-center gap-2">
              <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <Input
                value={sourceUrl}
                onChange={e => handleSourceUrlChange(e.target.value)}
                placeholder="https://source-url..."
                className="h-7 text-xs"
              />
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Add tag..."
                className="h-6 w-20 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 focus-visible:w-32 transition-all"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              {tagInput && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={handleAddTag}
                >
                  <Tag className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-2" />

          {/* Tiptap Editor */}
          <VaultTiptapEditor
            content={content}
            onChange={handleContentChange}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-1.5">
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <span>
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
          {note && (
            <span>
              Last edited{' '}
              {new Date(note.updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
