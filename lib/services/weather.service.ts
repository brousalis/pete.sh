/**
 * Weather Service
 * Handles communication with Weather.gov API
 */

import axios from "axios"
import { config } from "@/lib/config"
import type { WeatherPoint, WeatherForecast, WeatherObservation } from "@/lib/types/weather.types"

export class WeatherService {
  private baseUrl = "https://api.weather.gov"
  private headers = {
    "User-Agent": "Petehome/1.0 (petehome@example.com)",
    Accept: "application/geo+json",
  }

  /**
   * Get weather point for coordinates
   */
  async getWeatherPoint(lat: number, lon: number): Promise<WeatherPoint> {
    try {
      // Weather.gov API requires coordinates to be rounded to 4 decimal places
      // Ensure longitude preserves negative sign
      const roundedLat = Math.round(lat * 10000) / 10000
      const roundedLon = Math.round(lon * 10000) / 10000
      const url = `${this.baseUrl}/points/${roundedLat},${roundedLon}`
      
      const response = await axios.get<WeatherPoint>(url, { headers: this.headers })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const statusText = error.response?.statusText
        const url = error.config?.url
        const responseData = error.response?.data
        console.error("Weather API error details:", {
          url,
          status,
          statusText,
          responseData,
          inputLat: lat,
          inputLon: lon,
          headers: error.config?.headers,
        })
        throw new Error(
          `Weather API error: ${error.message}${status ? ` (${status} ${statusText})` : ""}${url ? ` - URL: ${url}` : ""}`
        )
      }
      throw error
    }
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(lat?: number, lon?: number): Promise<WeatherObservation> {
    const latitude = lat || config.weather.latitude
    let longitude = lon || config.weather.longitude

    // Validate and fix longitude for US locations (should be negative for most of US)
    if (latitude > 24 && latitude < 50 && longitude > 0) {
      console.warn(
        `Warning: Longitude is positive (${longitude}) for US location. Converting to negative.`
      )
      longitude = -Math.abs(longitude)
    }

    try {
      // First get the weather point
      const point = await this.getWeatherPoint(latitude, longitude)

      // Get the nearest observation station
      const stationsResponse = await axios.get<{ features: Array<{ properties: { stationIdentifier: string } }> }>(
        point.properties.observationStations,
        { headers: this.headers }
      )

      if (!stationsResponse.data.features || stationsResponse.data.features.length === 0) {
        throw new Error("No observation stations found")
      }

      const stationId = stationsResponse.data.features[0].properties.stationIdentifier

      // Get latest observation
      const observationResponse = await axios.get<WeatherObservation>(
        `${this.baseUrl}/stations/${stationId}/observations/latest`,
        { headers: this.headers }
      )

      return observationResponse.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Weather API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get 5-day weather forecast
   */
  async getForecast(lat?: number, lon?: number): Promise<WeatherForecast> {
    const latitude = lat || config.weather.latitude
    let longitude = lon || config.weather.longitude

    // Validate and fix longitude for US locations (should be negative for most of US)
    if (latitude > 24 && latitude < 50 && longitude > 0) {
      console.warn(
        `Warning: Longitude is positive (${longitude}) for US location. Converting to negative.`
      )
      longitude = -Math.abs(longitude)
    }

    try {
      // First get the weather point
      const point = await this.getWeatherPoint(latitude, longitude)

      // Get the forecast
      const response = await axios.get<WeatherForecast>(point.properties.forecast, {
        headers: this.headers,
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Weather API error: ${error.message}`)
      }
      throw error
    }
  }
}
