"use client"

import { useState, useEffect } from "react"
import { Search, MapPin, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { MapsLocation } from "@/lib/types/maps.types"

interface MapsLocationPickerProps {
  onSelect: (location: MapsLocation) => void
  placeholder?: string
}

export function MapsLocationPicker({ onSelect, placeholder = "Search for a location..." }: MapsLocationPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MapsLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/maps/search?query=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        if (response.status === 400) {
          setError("Google Maps API not configured")
          return
        }
        throw new Error("Failed to search")
      }
      const data = await response.json()
      if (data.success && data.data) {
        setResults(data.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        search(query)
      }
    }, 500) // Debounce

    return () => clearTimeout(timeoutId)
  }, [query])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching...
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-1 rounded-lg border bg-background p-2 max-h-60 overflow-y-auto">
          {results.map((location) => (
            <button
              key={location.place_id}
              onClick={() => {
                onSelect(location)
                setQuery(location.formatted_address)
                setResults([])
              }}
              className="w-full flex items-start gap-2 rounded-md p-2 hover:bg-muted text-left transition-colors"
            >
              <MapPin className="size-4 text-brand mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {location.name || location.formatted_address}
                </p>
                {location.name && (
                  <p className="text-xs text-muted-foreground truncate">{location.formatted_address}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
