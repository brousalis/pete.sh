import { BlogPostCard } from '@/components/blog/blog-post-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { blogService } from '@/lib/services/blog.service'
import { ArrowLeft, Tag } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog | Petehome',
  description:
    'Thoughts on technology, smart home automation, and software development.',
}

// Revalidate every 60 seconds
export const revalidate = 60

interface BlogPageProps {
  searchParams: Promise<{ tag?: string; page?: string }>
}

export default async function PublicBlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const tag = params.tag
  const page = parseInt(params.page || '1', 10)
  const pageSize = 9

  // Fetch published posts
  const { posts, total } = await blogService.getPublishedPosts(
    { page, pageSize },
    tag
  )

  // Fetch tags
  const tagsData = await blogService.getTags()
  const tags = tagsData.slice(0, 10)

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-muted/30 border-b">
        <div className="container px-4 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Blog
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Thoughts on technology, smart home automation, and software
            development.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr,280px]">
          {/* Posts */}
          <div className="space-y-8">
            {/* Active tag filter */}
            {tag && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  Filtered by:
                </span>
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <Link href="/blog" className="hover:text-destructive ml-1">
                    ×
                  </Link>
                </Badge>
              </div>
            )}

            {/* Posts grid */}
            {posts.length === 0 ? (
              <div className="bg-card rounded-xl border p-12 text-center">
                <p className="text-muted-foreground">
                  {tag ? `No posts tagged with "${tag}"` : 'No posts yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {posts.map(post => (
                  <BlogPostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                {page > 1 && (
                  <Button variant="outline" asChild>
                    <Link
                      href={`/blog?page=${page - 1}${tag ? `&tag=${tag}` : ''}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                <span className="text-muted-foreground px-4 text-sm">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Button variant="outline" asChild>
                    <Link
                      href={`/blog?page=${page + 1}${tag ? `&tag=${tag}` : ''}`}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Tags */}
            {tags.length > 0 && (
              <div className="bg-card rounded-xl border p-6">
                <h3 className="mb-4 font-semibold">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(({ tag: t, count }) => (
                    <Link key={t} href={`/blog?tag=${t}`}>
                      <Badge
                        variant={t === tag ? 'default' : 'outline'}
                        className="hover:bg-muted cursor-pointer"
                      >
                        {t} ({count})
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="mb-2 font-semibold">About</h3>
              <p className="text-muted-foreground text-sm">
                Welcome to my blog! I write about building smart home systems,
                software development, and everything in between.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="text-muted-foreground container px-4 py-8 text-center text-sm">
          <p>Built with Next.js and Supabase</p>
        </div>
      </footer>
    </div>
  )
}
