'use client'

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import type { JSONContent } from '@tiptap/react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import { useCallback, useEffect } from 'react'
import { TiptapToolbar } from './tiptap-toolbar'

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

interface TiptapEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent, html: string) => void
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
  editable?: boolean
  className?: string
}

export function TiptapEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = 'Start writing your post...',
  editable = true,
  className = '',
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand underline underline-offset-2 hover:text-brand/80',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON(), editor.getHTML())
      }
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (
      editor &&
      content &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(content)
    ) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  // Handle image upload
  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload || !editor) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'

    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const url = await onImageUpload(file)
        editor.chain().focus().setImage({ src: url }).run()
      } catch (error) {
        console.error('Failed to upload image:', error)
      }
    }

    input.click()
  }, [editor, onImageUpload])

  if (!editor) {
    return <div className="bg-muted min-h-[300px] animate-pulse rounded-lg" />
  }

  return (
    <div className="bg-background overflow-hidden rounded-lg border">
      {editable && (
        <TiptapToolbar
          editor={editor}
          onImageUpload={onImageUpload ? handleImageUpload : undefined}
        />
      )}
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// Export hook for external use
export function useTiptapEditor(options?: {
  content?: JSONContent
  onChange?: (content: JSONContent, html: string) => void
  editable?: boolean
}) {
  return useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-brand underline underline-offset-2' },
      }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
      Underline,
    ],
    content: options?.content,
    editable: options?.editable ?? true,
    onUpdate: ({ editor }) => {
      options?.onChange?.(editor.getJSON(), editor.getHTML())
    },
  })
}

// Helper to get editor instance type
export type { Editor }
