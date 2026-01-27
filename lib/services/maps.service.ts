/**
 * Google Maps Service
 * Handles communication with Google Maps API
 */

import axios from "axios"
import { config } from "@/lib/config"
import type { MapsLocation, MapsPlaceDetails, MapsAutocompletePrediction, MapsDirections } from "@/lib/types/maps.types"

export class MapsService {
  private apiKey: string

  constructor() {
    this.apiKey = config.google.apiKey || ""
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  /**
   * Search for locations
   */
  async searchLocation(query: string): Promise<MapsLocation[]> {
    if (!this.isConfigured()) {
      throw new Error("Google Maps API key not configured")
    }

    try {
      const response = await axios.get<{ results: MapsLocation[] }>(
        "https://maps.googleapis.com/maps/api/place/textsearch/json",
        {
          params: {
            query,
            key: this.apiKey,
          },
        }
      )

      return response.data.results || []
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google Maps API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get place details
   */
  async getPlaceDetails(placeId: string): Promise<MapsPlaceDetails> {
    if (!this.isConfigured()) {
      throw new Error("Google Maps API key not configured")
    }

    try {
      const response = await axios.get<{ result: MapsPlaceDetails }>(
        "https://maps.googleapis.com/maps/api/place/details/json",
        {
          params: {
            place_id: placeId,
            key: this.apiKey,
            fields: "place_id,formatted_address,geometry,name,types,address_components,international_phone_number,website,rating,user_ratings_total,opening_hours,photos,reviews",
          },
        }
      )

      return response.data.result
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google Maps API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get autocomplete predictions
   */
  async getAutocomplete(input: string, locationBias?: { lat: number; lng: number }): Promise<MapsAutocompletePrediction[]> {
    if (!this.isConfigured()) {
      throw new Error("Google Maps API key not configured")
    }

    try {
      const params: Record<string, string> = {
        input,
        key: this.apiKey,
      }

      // Add location bias for better local results (Chicago area by default)
      if (locationBias) {
        params.location = `${locationBias.lat},${locationBias.lng}`
        params.radius = "50000" // 50km radius
      }

      const response = await axios.get<{
        predictions: MapsAutocompletePrediction[]
        status: string
        error_message?: string
      }>(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json",
        { params }
      )

      // Log API status for debugging
      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        console.error("[Maps Autocomplete] API Status:", response.data.status, response.data.error_message)
      }

      return response.data.predictions || []
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[Maps Autocomplete] Error:", error.response?.data || error.message)
        throw new Error(`Google Maps API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(origin: string, destination: string): Promise<MapsDirections> {
    if (!this.isConfigured()) {
      throw new Error("Google Maps API key not configured")
    }

    try {
      const response = await axios.get<MapsDirections>(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin,
            destination,
            key: this.apiKey,
          },
        }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google Maps API error: ${error.message}`)
      }
      throw error
    }
  }
}
