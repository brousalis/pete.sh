import { BlogPostCardCompact } from '@/components/blog/blog-post-card'
import { BlogPostContent } from '@/components/blog/blog-post-content'
import { Button } from '@/components/ui/button'
import { blogService } from '@/lib/services/blog.service'
import { ArrowLeft, Home } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

// Generate metadata
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await blogService.getPublishedPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found | petehome Blog',
    }
  }

  return {
    title: `${post.title} | petehome Blog`,
    description: post.excerpt || `Read ${post.title} on petehome Blog`,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      publishedTime: post.publishedAt || undefined,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  }
}

// Revalidate every 60 seconds
export const revalidate = 60

export default async function PublicBlogPostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = await blogService.getPublishedPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Fetch related posts (same tags, excluding current)
  const { posts: allPosts } = await blogService.getPublishedPosts({
    page: 1,
    pageSize: 10,
  })
  const relatedPosts = allPosts
    .filter(p => p.id !== post.id && p.tags.some(t => post.tags.includes(t)))
    .slice(0, 3)

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/blog">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Blog
                </Link>
              </Button>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="container px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <BlogPostContent
            title={post.title}
            contentHtml={post.contentHtml}
            featuredImage={post.featuredImage}
            tags={post.tags}
            publishedAt={post.publishedAt}
            readingTimeMinutes={post.readingTimeMinutes}
          />
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-muted/30 border-t">
          <div className="container px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-xl font-semibold">Related Posts</h2>
              <div className="space-y-4">
                {relatedPosts.map(relatedPost => (
                  <BlogPostCardCompact
                    key={relatedPost.id}
                    post={relatedPost}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t">
        <div className="container px-4 py-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
