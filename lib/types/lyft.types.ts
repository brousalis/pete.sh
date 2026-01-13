/**
 * TypeScript types for Lyft integration
 */

export interface LyftLocation {
  lat: number
  lng: number
  address?: string
}

export interface LyftRideRequest {
  ride_type: string
  origin: LyftLocation
  destination: LyftLocation
  passenger?: {
    phone_number?: string
    first_name?: string
  }
}

export interface LyftRide {
  ride_id: string
  status: "pending" | "accepted" | "arrived" | "pickedUp" | "droppedOff" | "canceled"
  ride_type: string
  origin: LyftLocation
  destination: LyftLocation
  passenger: {
    id: string
    first_name: string
    phone_number: string
  }
  driver?: {
    id: string
    first_name: string
    phone_number: string
    rating: number
    vehicle: {
      make: string
      model: string
      license_plate: string
      color: string
    }
    location: LyftLocation
    eta_seconds?: number
  }
  pricing?: {
    amount: number
    currency: string
    primetime_percentage: string
  }
  requested_at: string
  pickup_eta_seconds?: number
}

export interface LyftRideType {
  ride_type: string
  display_name: string
  seats: number
  image_url: string
  pricing_details: {
    base_charge: number
    cost_per_mile: number
    cost_per_minute: number
    currency: string
    trust_and_service: number
    minimum: number
    cancel_penalty_amount: number
  }
  eta_seconds?: number
}

export interface LyftEta {
  eta_seconds: number
  ride_type: string
}
