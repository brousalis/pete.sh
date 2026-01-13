/**
 * TypeScript types for Google Maps integration
 */

export interface MapsLocation {
  place_id: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
    viewport?: {
      northeast: {
        lat: number
        lng: number
      }
      southwest: {
        lat: number
        lng: number
      }
    }
  }
  name?: string
  types: string[]
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

export interface MapsPlaceDetails extends MapsLocation {
  international_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  opening_hours?: {
    open_now: boolean
    weekday_text?: string[]
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
    html_attributions: string[]
  }>
  reviews?: Array<{
    author_name: string
    author_url?: string
    language: string
    profile_photo_url?: string
    rating: number
    relative_time_description: string
    text: string
    time: number
  }>
}

export interface MapsAutocompletePrediction {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  types: string[]
}

export interface MapsDirections {
  routes: Array<{
    summary: string
    legs: Array<{
      distance: {
        text: string
        value: number
      }
      duration: {
        text: string
        value: number
      }
      start_address: string
      end_address: string
      start_location: {
        lat: number
        lng: number
      }
      end_location: {
        lat: number
        lng: number
      }
      steps: Array<{
        distance: {
          text: string
          value: number
        }
        duration: {
          text: string
          value: number
        }
        start_location: {
          lat: number
          lng: number
        }
        end_location: {
          lat: number
          lng: number
        }
        html_instructions: string
        travel_mode: string
      }>
    }>
    overview_polyline: {
      points: string
    }
    bounds: {
      northeast: {
        lat: number
        lng: number
      }
      southwest: {
        lat: number
        lng: number
      }
    }
  }>
}
