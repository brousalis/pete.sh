'use client'

import { BlogEditor } from '@/components/blog/blog-editor'
import { apiGet } from '@/lib/api/client'
import type { BlogPost } from '@/lib/types/blog.types'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'

interface EditPageProps {
  params: Promise<{ slug: string }>
}

export default function EditBlogPostPage({ params }: EditPageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await apiGet<BlogPost>(`/api/blog/posts/slug/${slug}`)
        if (response.success && response.data) {
          setPost(response.data)
        } else {
          setError(response.error || 'Post not found')
        }
      } catch (err) {
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error || 'Post not found'}</p>
        <button
          onClick={() => router.push('/posts')}
          className="text-brand hover:underline"
        >
          Back to Blog
        </button>
      </div>
    )
  }

  return <BlogEditor post={post} />
}
