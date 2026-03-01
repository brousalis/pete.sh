'use client'

import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Search, Tag, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

interface TagMultiSelectProps {
  tags: [string, number][]
  selected: Set<string>
  onSelectedChange: (selected: Set<string>) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
}

export function TagMultiSelect({
  tags,
  selected,
  onSelectedChange,
  placeholder = 'Tags',
  className,
  triggerClassName,
  align = 'start',
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTags = useMemo(() => {
    if (!search) return tags
    const lower = search.toLowerCase()
    return tags.filter(([tag]) => tag.toLowerCase().includes(lower))
  }, [tags, search])

  const toggleTag = (tag: string) => {
    const next = new Set(selected)
    const key = tag.toLowerCase()
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectedChange(next)
  }

  const clearAll = () => {
    onSelectedChange(new Set())
  }

  const selectedArray = useMemo(
    () => tags.filter(([tag]) => selected.has(tag.toLowerCase())).map(([tag]) => tag),
    [tags, selected]
  )

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => inputRef.current?.focus(), 50) }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border/40 px-2.5 py-1.5 text-xs font-medium transition-all bg-muted/30 hover:bg-muted/50',
            selected.size > 0 ? 'text-foreground' : 'text-muted-foreground',
            triggerClassName
          )}
        >
          <Tag className="size-3 shrink-0" />
          {selected.size === 0 ? (
            <span>{placeholder}</span>
          ) : selected.size <= 2 ? (
            <span className="truncate max-w-[140px]">{selectedArray.join(', ')}</span>
          ) : (
            <span>{selected.size} tags</span>
          )}
          <ChevronDown className={cn('size-3 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-64 p-0', className)}
        align={align}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground/50" />
          <input
            ref={inputRef}
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Selected pills */}
        {selectedArray.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-3 py-2">
            {selectedArray.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="h-5 gap-0.5 pl-1.5 pr-1 text-[10px] font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="size-2.5" />
              </Badge>
            ))}
            <button
              onClick={clearAll}
              className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
            >
              Clear
            </button>
          </div>
        )}

        {/* Tag list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {filteredTags.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No tags found
            </div>
          ) : (
            filteredTags.map(([tag, count]) => {
              const isSelected = selected.has(tag.toLowerCase())
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/60'
                    )}
                  >
                    {isSelected && <Check className="size-2.5" />}
                  </div>
                  <span className={cn('flex-1 text-left truncate', isSelected && 'font-medium')}>
                    {tag}
                  </span>
                  <span className="tabular-nums text-[10px] text-muted-foreground/60">{count}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
