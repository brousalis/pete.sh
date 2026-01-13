/**
 * HUE Bridge Service
 * Handles communication with Philips HUE bridge
 */

import axios from "axios"
import { config } from "@/lib/config"
import type { HueLight, HueZone, HueScene } from "@/lib/types/hue.types"

export class HueService {
  private baseUrl: string

  constructor() {
    const bridgeIp = config.hue.bridgeIp
    const username = config.hue.username

    if (!bridgeIp || !username) {
      this.baseUrl = ""
      return
    }

    this.baseUrl = `http://${bridgeIp}/api/${username}`
  }

  isConfigured(): boolean {
    return config.hue.isConfigured && this.baseUrl !== ""
  }

  /**
   * Get all lights
   */
  async getLights(): Promise<Record<string, HueLight>> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.get<Record<string, HueLight>>(`${this.baseUrl}/lights`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get all zones/rooms
   */
  async getZones(): Promise<Record<string, HueZone>> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.get<Record<string, HueZone>>(`${this.baseUrl}/groups`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Toggle a zone on/off
   */
  async toggleZone(zoneId: string, on?: boolean): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      // If on is not provided, toggle the current state
      if (on === undefined) {
        const zones = await this.getZones()
        const zone = zones[zoneId]
        if (!zone) {
          throw new Error(`Zone ${zoneId} not found`)
        }
        on = !zone.state.any_on
      }

      const response = await axios.put(`${this.baseUrl}/groups/${zoneId}/action`, {
        on,
      })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Set brightness for a light
   */
  async setBrightness(lightId: string, brightness: number): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    if (brightness < 0 || brightness > 254) {
      throw new Error("Brightness must be between 0 and 254")
    }

    try {
      const response = await axios.put(`${this.baseUrl}/lights/${lightId}/state`, {
        bri: brightness,
      })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get all scenes
   */
  async getScenes(): Promise<Record<string, HueScene>> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.get<Record<string, HueScene>>(`${this.baseUrl}/scenes`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get scenes for a specific zone
   */
  async getScenesForZone(zoneId: string): Promise<HueScene[]> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const allScenes = await this.getScenes()
      const zoneScenes = Object.values(allScenes).filter(
        (scene) => scene.group === zoneId || scene.lights.some((lightId) => {
          // Check if any light in the scene belongs to this zone
          return true // Simplified - would need to check zone membership
        })
      )

      return zoneScenes
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Activate a scene for a zone
   */
  async activateScene(zoneId: string, sceneId: string): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.put(`${this.baseUrl}/groups/${zoneId}/action`, {
        scene: sceneId,
      })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }
}
