"use client"

import { useState } from "react"
import { Car, MapPin, Loader2, AlertCircle } from "lucide-react"
import { MapsLocationPicker } from "./maps-location-picker"
import { Button } from "@/components/ui/button"
import type { MapsLocation } from "@/lib/types/maps.types"
import { toast } from "sonner"

export function LyftRequest() {
  const [pickup, setPickup] = useState<MapsLocation | null>(null)
  const [dropoff, setDropoff] = useState<MapsLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = async () => {
    if (!pickup || !dropoff) {
      toast.error("Please select both pickup and dropoff locations")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/lyft/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_type: "lyft",
          origin: {
            lat: pickup.geometry.location.lat,
            lng: pickup.geometry.location.lng,
            address: pickup.formatted_address,
          },
          destination: {
            lat: dropoff.geometry.location.lat,
            lng: dropoff.geometry.location.lng,
            address: dropoff.formatted_address,
          },
        }),
      })

      if (!response.ok) {
        if (response.status === 400) {
          setError("Lyft API not configured")
          return
        }
        throw new Error("Failed to request ride")
      }

      const data = await response.json()
      if (data.success) {
        toast.success("Ride requested successfully!")
        setPickup(null)
        setDropoff(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request ride")
      toast.error("Failed to request ride")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl bg-background p-4 ">
      <div className="flex items-center gap-2">
        <Car className="size-5 text-brand" />
        <h3 className="font-semibold text-foreground">Request a Lyft</h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Pickup Location</label>
          <MapsLocationPicker
            onSelect={setPickup}
            placeholder="Search for pickup location..."
          />
          {pickup && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span className="truncate">{pickup.formatted_address}</span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Dropoff Location</label>
          <MapsLocationPicker
            onSelect={setDropoff}
            placeholder="Search for dropoff location..."
          />
          {dropoff && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span className="truncate">{dropoff.formatted_address}</span>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleRequest}
        disabled={!pickup || !dropoff || loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            <Car className="size-4" />
            Request Ride
          </>
        )}
      </Button>
    </div>
  )
}
