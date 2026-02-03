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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { apiDelete, apiPost, apiPut } from '@/lib/api/client'
import { generateSlug } from '@/lib/services/blog.service'
import type {
  BlogPost,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '@/lib/types/blog.types'
import type { JSONContent } from '@tiptap/react'
import {
  ArrowLeft,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  Send,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { BlogPostContent } from './blog-post-content'
import { TiptapEditor } from './tiptap-editor'

interface BlogEditorProps {
  post?: BlogPost
  onSave?: (post: BlogPost) => void
}

export function BlogEditor({ post, onSave }: BlogEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isEditing = !!post

  // Form state
  const [title, setTitle] = useState(post?.title || '')
  const [slug, setSlug] = useState(post?.slug || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState<JSONContent>(
    post?.content || { type: 'doc', content: [] }
  )
  const [contentHtml, setContentHtml] = useState(post?.contentHtml || '')
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || '')
  const [tags, setTags] = useState<string[]>(post?.tags || [])
  const [tagInput, setTagInput] = useState('')

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [autoSlug, setAutoSlug] = useState(!isEditing)

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title) {
      setSlug(generateSlug(title))
    }
  }, [title, autoSlug])

  // Track dirty state
  useEffect(() => {
    if (isEditing) {
      const hasChanges =
        title !== post.title ||
        slug !== post.slug ||
        excerpt !== (post.excerpt || '') ||
        JSON.stringify(content) !== JSON.stringify(post.content) ||
        featuredImage !== (post.featuredImage || '') ||
        JSON.stringify(tags) !== JSON.stringify(post.tags)
      setIsDirty(hasChanges)
    } else {
      setIsDirty(title.length > 0 || (content.content?.length ?? 0) > 0)
    }
  }, [title, slug, excerpt, content, featuredImage, tags, post, isEditing])

  // Handle content change
  const handleContentChange = useCallback((json: JSONContent, html: string) => {
    setContent(json)
    setContentHtml(html)
  }, [])

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/blog/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Upload failed')
    }

    return data.data.url
  }, [])

  // Handle featured image upload
  const handleFeaturedImageUpload = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'

    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const url = await handleImageUpload(file)
        setFeaturedImage(url)
        toast({
          title: 'Image uploaded',
          description: 'Featured image has been set.',
        })
      } catch (error) {
        toast({
          title: 'Upload failed',
          description:
            error instanceof Error ? error.message : 'Failed to upload image',
          variant: 'destructive',
        })
      }
    }

    input.click()
  }, [handleImageUpload, toast])

  // Add tag
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }, [tagInput, tags])

  // Remove tag
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter(t => t !== tagToRemove))
    },
    [tags]
  )

  // Save draft
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your post.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      let savedPost: BlogPost

      if (isEditing) {
        const input: UpdateBlogPostInput = {
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || undefined,
          content,
          contentHtml,
          featuredImage: featuredImage || undefined,
          tags,
        }

        const response = await apiPut<BlogPost>(
          `/api/blog/posts/${post.id}`,
          input
        )
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to save post')
        }
        savedPost = response.data
      } else {
        const input: CreateBlogPostInput = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          content,
          contentHtml,
          featuredImage: featuredImage || undefined,
          status: 'draft',
          tags,
        }

        const response = await apiPost<BlogPost>('/api/blog/posts', input)
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create post')
        }
        savedPost = response.data
      }

      toast({
        title: 'Saved',
        description: 'Your post has been saved as a draft.',
      })
      onSave?.(savedPost)

      if (!isEditing) {
        router.push(`/posts/${savedPost.slug}/edit`)
      }
    } catch (error) {
      toast({
        title: 'Save failed',
        description:
          error instanceof Error ? error.message : 'Failed to save post',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [
    title,
    slug,
    excerpt,
    content,
    contentHtml,
    featuredImage,
    tags,
    isEditing,
    post,
    router,
    toast,
    onSave,
  ])

  // Publish post
  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your post.',
        variant: 'destructive',
      })
      return
    }

    setIsPublishing(true)
    try {
      let savedPost: BlogPost

      if (isEditing) {
        const input: UpdateBlogPostInput = {
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || undefined,
          content,
          contentHtml,
          featuredImage: featuredImage || undefined,
          status: 'published',
          tags,
        }

        const response = await apiPut<BlogPost>(
          `/api/blog/posts/${post.id}`,
          input
        )
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to publish post')
        }
        savedPost = response.data
      } else {
        const input: CreateBlogPostInput = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          content,
          contentHtml,
          featuredImage: featuredImage || undefined,
          status: 'published',
          tags,
        }

        const response = await apiPost<BlogPost>('/api/blog/posts', input)
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to publish post')
        }
        savedPost = response.data
      }

      toast({ title: 'Published!', description: 'Your post is now live.' })
      onSave?.(savedPost)
      router.push('/posts')
    } catch (error) {
      toast({
        title: 'Publish failed',
        description:
          error instanceof Error ? error.message : 'Failed to publish post',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }, [
    title,
    slug,
    excerpt,
    content,
    contentHtml,
    featuredImage,
    tags,
    isEditing,
    post,
    router,
    toast,
    onSave,
  ])

  // Delete post
  const handleDelete = useCallback(async () => {
    if (!isEditing) return

    setIsDeleting(true)
    try {
      const response = await apiDelete(`/api/blog/posts/${post.id}`)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete post')
      }

      toast({ title: 'Deleted', description: 'Your post has been deleted.' })
      router.push('/posts')
    } catch (error) {
      toast({
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete post',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [isEditing, post, router, toast])

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/posts')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">
                {isEditing ? 'Edit Post' : 'New Post'}
              </span>
              {post?.status === 'published' && (
                <Badge
                  variant="default"
                  className="bg-green-500/10 text-green-600"
                >
                  Published
                </Badge>
              )}
              {post?.status === 'draft' && (
                <Badge variant="secondary">Draft</Badge>
              )}
              {isDirty && (
                <Badge variant="outline" className="text-amber-600">
                  Unsaved
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing || !title.trim()}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {post?.status === 'published' ? 'Update' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 py-6">
        {showPreview ? (
          <div className="mx-auto max-w-3xl">
            <BlogPostContent
              title={title || 'Untitled Post'}
              contentHtml={contentHtml}
              featuredImage={featuredImage}
              tags={tags}
              publishedAt={post?.publishedAt || null}
              readingTimeMinutes={post?.readingTimeMinutes || 1}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
            {/* Editor */}
            <div className="space-y-4">
              <Input
                placeholder="Post title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="placeholder:text-muted-foreground/50 h-auto border-0 bg-transparent px-0 text-3xl font-bold focus-visible:ring-0"
              />
              <TiptapEditor
                content={content}
                onChange={handleContentChange}
                onImageUpload={handleImageUpload}
                placeholder="Start writing your post..."
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Tabs defaultValue="settings" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="settings" className="flex-1">
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="flex-1">
                    SEO
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4 pt-4">
                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        value={slug}
                        onChange={e => {
                          setSlug(e.target.value)
                          setAutoSlug(false)
                        }}
                        placeholder="post-url-slug"
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      /blog/{slug || 'post-url-slug'}
                    </p>
                  </div>

                  {/* Featured Image */}
                  <div className="space-y-2">
                    <Label>Featured Image</Label>
                    {featuredImage ? (
                      <div className="relative">
                        <img
                          src={featuredImage}
                          alt="Featured"
                          className="aspect-video w-full rounded-lg object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={() => setFeaturedImage('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-24 w-full border-dashed"
                        onClick={handleFeaturedImageUpload}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        placeholder="Add tag..."
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleAddTag}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-destructive ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post Info */}
                  {isEditing && (
                    <div className="space-y-2 rounded-lg border p-3 text-sm">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{post.readingTimeMinutes || 1} min read</span>
                      </div>
                      {post.publishedAt && (
                        <p className="text-muted-foreground">
                          Published:{' '}
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        Created: {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Delete */}
                  {isEditing && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete Post
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your post.
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
                  )}
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 pt-4">
                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt / Meta Description</Label>
                    <Textarea
                      id="excerpt"
                      value={excerpt}
                      onChange={e => setExcerpt(e.target.value)}
                      placeholder="A brief description of your post..."
                      rows={3}
                    />
                    <p className="text-muted-foreground text-xs">
                      {excerpt.length}/160 characters recommended
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    <Label>Search Preview</Label>
                    <div className="space-y-1 rounded-lg border p-3">
                      <p className="text-brand truncate text-sm">
                        petehome.dev/blog/{slug || 'post-url-slug'}
                      </p>
                      <p className="truncate text-lg font-medium">
                        {title || 'Post Title'}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {excerpt || 'Post excerpt will appear here...'}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
