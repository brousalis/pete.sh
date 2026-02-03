'use client'

import { BlogPostCard } from '@/components/blog/blog-post-card'
import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { apiDelete, apiGet, apiPut } from '@/lib/api/client'
import type { BlogPostStatus, BlogPostSummary } from '@/lib/types/blog.types'
import { FileText, Filter, Globe, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function BlogDashboardPage() {
  const { toast } = useToast()
  const [posts, setPosts] = useState<BlogPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | 'all'>(
    'all'
  )
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

  // Fetch posts
  const fetchPosts = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') {
          params.set('status', statusFilter)
        }

        const response = await apiGet<{
          posts: BlogPostSummary[]
          total: number
        }>(`/api/blog/posts?${params.toString()}`)

        if (response.success && response.data) {
          setPosts(response.data.posts)
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [statusFilter]
  )

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Handle publish
  const handlePublish = useCallback(
    async (id: string) => {
      try {
        const response = await apiPut(`/api/blog/posts/${id}`, {
          status: 'published',
        })
        if (response.success) {
          toast({ title: 'Published', description: 'Post is now live.' })
          fetchPosts()
        } else {
          throw new Error(response.error)
        }
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error ? error.message : 'Failed to publish',
          variant: 'destructive',
        })
      }
    },
    [toast, fetchPosts]
  )

  // Handle unpublish
  const handleUnpublish = useCallback(
    async (id: string) => {
      try {
        const response = await apiPut(`/api/blog/posts/${id}`, {
          status: 'draft',
        })
        if (response.success) {
          toast({ title: 'Unpublished', description: 'Post is now a draft.' })
          fetchPosts()
        } else {
          throw new Error(response.error)
        }
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error ? error.message : 'Failed to unpublish',
          variant: 'destructive',
        })
      }
    },
    [toast, fetchPosts]
  )

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletePostId) return

    try {
      const response = await apiDelete(`/api/blog/posts/${deletePostId}`)
      if (response.success) {
        toast({ title: 'Deleted', description: 'Post has been deleted.' })
        fetchPosts()
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      })
    } finally {
      setDeletePostId(null)
    }
  }, [deletePostId, toast, fetchPosts])

  // Stats
  const totalPosts = posts.length
  const publishedPosts = posts.filter(p => p.status === 'published').length
  const draftPosts = posts.filter(p => p.status === 'draft').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardCardHeader
        icon={<FileText className="text-brand size-5" />}
        iconContainerClassName="bg-brand/10"
        title="Blog"
        onRefresh={() => fetchPosts(true)}
        refreshing={refreshing}
        rightExtra={
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">Total Posts</p>
          <p className="text-2xl font-bold">{totalPosts}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-500" />
            <p className="text-muted-foreground text-sm">Published</p>
          </div>
          <p className="text-2xl font-bold">{publishedPosts}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-4 w-4" />
            <p className="text-muted-foreground text-sm">Drafts</p>
          </div>
          <p className="text-2xl font-bold">{draftPosts}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <Select
            value={statusFilter}
            onValueChange={value =>
              setStatusFilter(value as BlogPostStatus | 'all')
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card animate-pulse rounded-xl border">
              <div className="bg-muted aspect-video" />
              <div className="space-y-3 p-4">
                <div className="bg-muted h-4 w-16 rounded" />
                <div className="bg-muted h-6 w-3/4 rounded" />
                <div className="bg-muted h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <FileText className="text-muted-foreground/50 mx-auto h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Create your first blog post to get started.
          </p>
          <Button asChild className="mt-4">
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <BlogPostCard
              key={post.id}
              post={post}
              showActions
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onDelete={setDeletePostId}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePostId}
        onOpenChange={() => setDeletePostId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
