/**
 * Lyft Service
 * Handles communication with Lyft API
 */

import axios from "axios"
import { config } from "@/lib/config"
import type { LyftRideRequest, LyftRide, LyftRideType, LyftEta } from "@/lib/types/lyft.types"

export class LyftService {
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.clientId = config.lyft.clientId || ""
    this.clientSecret = config.lyft.clientSecret || ""
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret)
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const response = await axios.post(
        "https://api.lyft.com/oauth/token",
        {
          grant_type: "client_credentials",
          scope: "public",
        },
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      this.accessToken = response.data.access_token
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000 // Refresh 1 min early

      return this.accessToken
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Lyft OAuth error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Request a ride
   */
  async requestRide(request: LyftRideRequest): Promise<LyftRide> {
    if (!this.isConfigured()) {
      throw new Error("Lyft API not configured")
    }

    try {
      const token = await this.getAccessToken()

      const response = await axios.post<LyftRide>(
        "https://api.lyft.com/v1/rides",
        request,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Lyft API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get ride status
   */
  async getRideStatus(rideId: string): Promise<LyftRide> {
    if (!this.isConfigured()) {
      throw new Error("Lyft API not configured")
    }

    try {
      const token = await this.getAccessToken()

      const response = await axios.get<LyftRide>(
        `https://api.lyft.com/v1/rides/${rideId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Lyft API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Cancel a ride
   */
  async cancelRide(rideId: string): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("Lyft API not configured")
    }

    try {
      const token = await this.getAccessToken()

      const response = await axios.post(
        `https://api.lyft.com/v1/rides/${rideId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Lyft API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get ETAs for ride types
   */
  async getEtas(lat: number, lng: number): Promise<LyftEta[]> {
    if (!this.isConfigured()) {
      throw new Error("Lyft API not configured")
    }

    try {
      const token = await this.getAccessToken()

      const response = await axios.get<{ eta_estimates: LyftEta[] }>(
        "https://api.lyft.com/v1/eta",
        {
          params: {
            lat,
            lng,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data.eta_estimates || []
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Lyft API error: ${error.message}`)
      }
      throw error
    }
  }
}
