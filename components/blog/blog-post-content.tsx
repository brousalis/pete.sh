'use client'

import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Calendar, Clock, Tag } from 'lucide-react'

interface BlogPostContentProps {
  title: string
  contentHtml: string | null
  featuredImage?: string | null
  tags?: string[]
  publishedAt?: string | null
  readingTimeMinutes?: number | null
  showMeta?: boolean
}

export function BlogPostContent({
  title,
  contentHtml,
  featuredImage,
  tags = [],
  publishedAt,
  readingTimeMinutes,
  showMeta = true,
}: BlogPostContentProps) {
  return (
    <article className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          {title}
        </h1>

        {showMeta && (
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
            {publishedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <time dateTime={publishedAt}>
                  {format(new Date(publishedAt), 'MMMM d, yyyy')}
                </time>
              </div>
            )}
            {readingTimeMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{readingTimeMinutes} min read</span>
              </div>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="text-muted-foreground h-4 w-4" />
            {tags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {/* Featured Image */}
      {featuredImage && (
        <div className="relative aspect-video overflow-hidden rounded-xl">
          <img
            src={featuredImage}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      {contentHtml && (
        <div
          className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-brand prose-a:no-underline hover:prose-a:underline prose-code:text-brand prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl prose-img:rounded-xl prose-blockquote:border-l-brand prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:rounded-r-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </article>
  )
}
