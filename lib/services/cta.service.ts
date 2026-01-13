/**
 * CTA Transit Service
 * Handles communication with Chicago Transit Authority APIs
 */

import axios from "axios"
import { config } from "@/lib/config"
import type {
  CTABusResponse,
  CTATrainResponse,
  CTARouteConfig,
  CTABusStopsResponse,
} from "@/lib/types/cta.types"

export class CTAService {
  private busApiUrl = "http://www.ctabustracker.com/bustime/api/v2"
  private trainApiUrl = "http://lapi.transitchicago.com/api/1.0"

  isConfigured(): boolean {
    return Boolean(config.cta.apiKey)
  }

  /**
   * Get bus predictions for a route and stop
   */
  async getBusPredictions(route: string, stopId: string): Promise<CTABusResponse> {
    if (!this.isConfigured()) {
      throw new Error("CTA API key not configured")
    }

    try {
      const response = await axios.get<CTABusResponse>(`${this.busApiUrl}/getpredictions`, {
        params: {
          key: config.cta.apiKey,
          rt: route,
          stpid: stopId,
          format: "json",
        },
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CTA Bus API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get train predictions for a line and station
   */
  async getTrainPredictions(line: string, stationId: string): Promise<CTATrainResponse> {
    if (!config.cta.isTrainConfigured) {
      throw new Error("CTA Train API key not configured")
    }

    try {
      // Use mapid to get all trains at the station, then filter by route client-side
      const response = await axios.get<CTATrainResponse>(`${this.trainApiUrl}/ttarrivals.aspx`, {
        params: {
          key: config.cta.trainApiKey,
          mapid: stationId,
          rt: line, // Filter by route (Brn for Brown, P for Purple)
          outputType: "JSON",
        },
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CTA Train API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get stops for a route and direction
   */
  async getStops(route: string, direction: string): Promise<CTABusStopsResponse> {
    if (!this.isConfigured()) {
      throw new Error("CTA API key not configured")
    }

    try {
      const response = await axios.get<CTABusStopsResponse>(`${this.busApiUrl}/getstops`, {
        params: {
          key: config.cta.apiKey,
          rt: route,
          dir: direction,
          format: "json",
        },
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CTA Bus Stops API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Find a stop ID by route, direction, and stop name (partial match)
   */
  async findStopId(route: string, direction: string, stopName: string): Promise<string | null> {
    try {
      const stopsResponse = await this.getStops(route, direction)
      const stops = stopsResponse["bustime-response"]?.stops || []

      // Search for stop by name (case-insensitive, partial match)
      const stopNameLower = stopName.toLowerCase()
      const stop = stops.find((s) => s.stpnm.toLowerCase().includes(stopNameLower))

      return stop?.stpid || null
    } catch (error) {
      console.error(`Error finding stop ID for ${route} ${direction} at ${stopName}:`, error)
      return null
    }
  }

  /**
   * Get all configured routes at once
   * Routes: 76, 36, 22 buses, Brown and Purple Lines southbound
   */
  async getAllRoutes(config: CTARouteConfig): Promise<{
    bus: Record<string, CTABusResponse>
    train: Record<string, CTATrainResponse>
  }> {
    const busPromises = config.bus.map(async (route) => {
      try {
        const predictions = await this.getBusPredictions(route.route, route.stopId)
        // Check if the response contains an error
        if (predictions["bustime-response"]?.error) {
          const errorMsg = predictions["bustime-response"].error[0]?.msg || "Unknown error"
          console.error(
            `Route ${route.route} (${route.direction}) stop ${route.stopId}: ${errorMsg}. ` +
              `Use /api/cta/bus/stops?route=${route.route}&direction=${route.direction} to find correct stop ID.`
          )
        }
        return { route: route.route, data: predictions }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error(`Route ${route.route} (${route.direction}) stop ${route.stopId}: ${errorMsg}`)
        return { route: route.route, data: null, error: errorMsg }
      }
    })

    const busResults = await Promise.all(busPromises)
    const busData: Record<string, CTABusResponse> = {}
    busResults.forEach((result) => {
      if (result.data) {
        busData[result.route] = result.data
      } else {
        // Include error in response for debugging
        busData[result.route] = {
          "bustime-response": {
            error: [
              {
                rt: result.route,
                msg: result.error || "Failed to fetch predictions",
              },
            ],
          },
        }
      }
    })

    const trainPromises = config.train.map(async (trainConfig) => {
      try {
        const predictions = await this.getTrainPredictions(trainConfig.line, trainConfig.stationId)
        return { line: trainConfig.line, data: predictions }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error(`Train ${trainConfig.line} station ${trainConfig.stationId}: ${errorMsg}`)
        return { line: trainConfig.line, data: null, error: errorMsg }
      }
    })

    const trainResults = await Promise.all(trainPromises)
    const trainData: Record<string, CTATrainResponse> = {}
    trainResults.forEach((result) => {
      if (result.data) {
        trainData[result.line] = result.data
      } else {
        // Include error in response for debugging
        trainData[result.line] = {
          ctatt: {
            tmst: new Date().toISOString(),
            errCd: "1",
            errNm: result.error || "Failed to fetch predictions",
            eta: [],
          },
        }
      }
    })

    return { bus: busData, train: trainData }
  }
}
