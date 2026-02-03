'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BlogPostSummary } from '@/lib/types/blog.types'
import { format } from 'date-fns'
import {
  Calendar,
  Clock,
  Edit,
  Eye,
  FileText,
  Globe,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'

interface BlogPostCardProps {
  post: BlogPostSummary
  showActions?: boolean
  onDelete?: (id: string) => void
  onPublish?: (id: string) => void
  onUnpublish?: (id: string) => void
}

export function BlogPostCard({
  post,
  showActions = false,
  onDelete,
  onPublish,
  onUnpublish,
}: BlogPostCardProps) {
  const isPublished = post.status === 'published'

  return (
    <div className="group bg-card relative overflow-hidden rounded-xl border transition-all hover:shadow-md">
      {/* Featured Image */}
      {post.featuredImage ? (
        <Link
          href={showActions ? `/posts/${post.slug}/edit` : `/blog/${post.slug}`}
        >
          <div className="relative aspect-video overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </Link>
      ) : (
        <Link
          href={showActions ? `/posts/${post.slug}/edit` : `/blog/${post.slug}`}
        >
          <div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden">
            <FileText className="text-muted-foreground/50 h-12 w-12" />
          </div>
        </Link>
      )}

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Status Badge (for dashboard) */}
        {showActions && (
          <div className="flex items-center gap-2">
            {isPublished ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                <Globe className="mr-1 h-3 w-3" />
                Published
              </Badge>
            ) : (
              <Badge variant="secondary">
                <FileText className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
          </div>
        )}

        {/* Title */}
        <Link
          href={showActions ? `/posts/${post.slug}/edit` : `/blog/${post.slug}`}
        >
          <h3 className="group-hover:text-brand line-clamp-2 text-lg font-semibold transition-colors">
            {post.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {post.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          {isPublished && post.publishedAt ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), 'MMM d, yyyy')}
              </time>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <time dateTime={post.createdAt}>
                {format(new Date(post.createdAt), 'MMM d, yyyy')}
              </time>
            </div>
          )}
          {post.readingTimeMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{post.readingTimeMinutes} min</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{post.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions (for dashboard) */}
        {showActions && (
          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/posts/${post.slug}/edit`}>
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Link>
              </Button>
              {isPublished && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/blog/${post.slug}`} target="_blank">
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Link>
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/posts/${post.slug}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {isPublished ? (
                  <DropdownMenuItem onClick={() => onUnpublish?.(post.id)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Unpublish
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPublish?.(post.id)}>
                    <Globe className="mr-2 h-4 w-4" />
                    Publish
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(post.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
}

// Compact card variant for lists
export function BlogPostCardCompact({ post }: { post: BlogPostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="bg-card hover:bg-muted/50 flex gap-4 rounded-lg border p-4 transition-colors"
    >
      {post.featuredImage && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="truncate font-semibold">{post.title}</h3>
        {post.excerpt && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {post.excerpt}
          </p>
        )}
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>
              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
            </time>
          )}
          {post.readingTimeMinutes && (
            <span>{post.readingTimeMinutes} min read</span>
          )}
        </div>
      </div>
    </Link>
  )
}
