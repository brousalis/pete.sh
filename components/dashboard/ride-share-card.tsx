"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Car,
  MapPin,
  Search,
  X,
  ExternalLink,
  Loader2,
  Navigation,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiGet } from "@/lib/api/client"
import type { MapsAutocompletePrediction, MapsPlaceDetails } from "@/lib/types/maps.types"
import { config } from "@/lib/config"

interface SelectedDestination {
  name: string
  address: string
  lat: number
  lng: number
}

interface RideShareCardProps {
  /** Compact mode for dashboard widget */
  compact?: boolean
}

export function RideShareCard({ compact = false }: RideShareCardProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [predictions, setPredictions] = useState<MapsAutocompletePrediction[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchDebounceRef = useRef<NodeJS.Timeout>(undefined)

  // Selection state
  const [selectedDestination, setSelectedDestination] = useState<SelectedDestination | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Home location (from config)
  const homeLocation = {
    lat: config.weather.latitude,
    lng: config.weather.longitude,
  }

  // Debounced search
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPredictions([])
      return
    }

    setIsSearching(true)
    try {
      const response = await apiGet<MapsAutocompletePrediction[]>(`/api/maps/autocomplete?input=${encodeURIComponent(query)}`)
      if (response.success) {
        setPredictions(response.data || [])
      }
    } catch {
      console.error("Failed to search places")
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      searchPlaces(searchQuery)
    }, 300)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery, searchPlaces])

  const handleSelectPlace = async (prediction: MapsAutocompletePrediction) => {
    setSearchOpen(false)
    setSearchQuery(prediction.structured_formatting.main_text)
    setIsLoadingDetails(true)

    try {
      // Get place details for coordinates
      const detailsResponse = await apiGet<MapsPlaceDetails>(`/api/maps/place/${prediction.place_id}`)
      if (!detailsResponse.success || !detailsResponse.data) throw new Error("Failed to get place details")
      const place = detailsResponse.data

      setSelectedDestination({
        name: place.name || prediction.structured_formatting.main_text,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      })
    } catch (error) {
      console.error("Failed to get place details:", error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleClearDestination = () => {
    setSelectedDestination(null)
    setSearchQuery("")
  }

  // Generate Uber deep link
  const getUberDeepLink = () => {
    if (!selectedDestination) return ""

    const params = new URLSearchParams({
      action: "setPickup",
      "pickup[latitude]": homeLocation.lat.toString(),
      "pickup[longitude]": homeLocation.lng.toString(),
      "pickup[nickname]": "Home",
      "dropoff[latitude]": selectedDestination.lat.toString(),
      "dropoff[longitude]": selectedDestination.lng.toString(),
      "dropoff[nickname]": selectedDestination.name,
      "dropoff[formatted_address]": selectedDestination.address,
    })

    return `https://m.uber.com/ul/?${params.toString()}`
  }

  // Generate Lyft deep link
  const getLyftDeepLink = () => {
    if (!selectedDestination) return ""

    const params = new URLSearchParams({
      "pickup[latitude]": homeLocation.lat.toString(),
      "pickup[longitude]": homeLocation.lng.toString(),
      "destination[latitude]": selectedDestination.lat.toString(),
      "destination[longitude]": selectedDestination.lng.toString(),
    })

    return `https://lyft.com/ride?${params.toString()}`
  }

  const handleRequestUber = () => {
    const deepLink = getUberDeepLink()
    if (deepLink) {
      window.open(deepLink, "_blank")
    }
  }

  const handleRequestLyft = () => {
    const deepLink = getLyftDeepLink()
    if (deepLink) {
      window.open(deepLink, "_blank")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Rideshare</h2>
        {selectedDestination && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearDestination}
            className="h-7 px-2 text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Destination selected - show summary and request buttons */}
      {selectedDestination ? (
        <div className="space-y-3">
          {/* Route summary - more compact in compact mode */}
          {!compact && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-background/50 p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-green-500/10">
                  <Navigation className="size-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="truncate text-sm font-medium">Home</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-background/50 p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
                  <MapPin className="size-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="truncate text-sm font-medium">{selectedDestination.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedDestination.address}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Compact destination display */}
          {compact && (
            <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
              <MapPin className="size-4 shrink-0 text-destructive" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{selectedDestination.name}</p>
              </div>
            </div>
          )}

          {/* Request buttons - side by side */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="gap-2 bg-black hover:bg-black/90"
              size={compact ? "default" : "lg"}
              onClick={handleRequestUber}
            >
              <Car className="size-4" />
              Uber
              <ExternalLink className="size-3 opacity-60" />
            </Button>
            <Button
              className="gap-2 bg-[#FF00BF] hover:bg-[#FF00BF]/90"
              size={compact ? "default" : "lg"}
              onClick={handleRequestLyft}
            >
              <Car className="size-4" />
              Lyft
              <ExternalLink className="size-3 opacity-60" />
            </Button>
          </div>

          {!compact && (
            <p className="text-center text-xs text-muted-foreground">
              Opens in app to confirm ride
            </p>
          )}
        </div>
      ) : (
        /* Search input */
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className={cn(
                "w-full justify-start gap-3 px-4",
                compact ? "h-10" : "h-12"
              )}
            >
              <Search className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Where to?</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 size-4 shrink-0 opacity-50" />
                <Input
                  placeholder="Search for a place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 border-0 focus-visible:ring-0"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <CommandList>
                {isSearching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isSearching && searchQuery.length >= 2 && predictions.length === 0 && (
                  <CommandEmpty>No places found.</CommandEmpty>
                )}
                {!isSearching && predictions.length > 0 && (
                  <CommandGroup>
                    {predictions.map((prediction) => (
                      <CommandItem
                        key={prediction.place_id}
                        value={prediction.place_id}
                        onSelect={() => handleSelectPlace(prediction)}
                        className="cursor-pointer gap-3 py-3"
                      >
                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">
                            {prediction.structured_formatting.main_text}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {prediction.structured_formatting.secondary_text}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {!isSearching && searchQuery.length < 2 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    <Clock className="mx-auto mb-2 size-8 opacity-40" />
                    <p>Search for a restaurant, address, or place</p>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Loading state for place details */}
      {isLoadingDetails && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
