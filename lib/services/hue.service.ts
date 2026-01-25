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
   * Get a single light by ID
   */
  async getLight(lightId: string): Promise<HueLight> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.get<HueLight>(`${this.baseUrl}/lights/${lightId}`)
      return { ...response.data, id: lightId }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Toggle an individual light on/off
   */
  async toggleLight(lightId: string, on?: boolean): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      // If on is not provided, toggle the current state
      if (on === undefined) {
        const light = await this.getLight(lightId)
        on = !light.state.on
      }

      const response = await axios.put(`${this.baseUrl}/lights/${lightId}/state`, {
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
   * Get a single zone by ID
   */
  async getZone(zoneId: string): Promise<HueZone> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.get<HueZone>(`${this.baseUrl}/groups/${zoneId}`)
      return { ...response.data, id: zoneId }
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
   * Toggle all lights on/off
   */
  async toggleAllLights(on: boolean): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      // Group 0 is special - it always refers to all lights
      const response = await axios.put(`${this.baseUrl}/groups/0/action`, {
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
   * Set brightness for all lights
   */
  async setAllBrightness(brightness: number): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    if (brightness < 1 || brightness > 254) {
      throw new Error("Brightness must be between 1 and 254")
    }

    try {
      const response = await axios.put(`${this.baseUrl}/groups/0/action`, {
        on: true,
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
        on: true,
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
   * Set brightness for a zone/group
   */
  async setZoneBrightness(zoneId: string, brightness: number): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    if (brightness < 1 || brightness > 254) {
      throw new Error("Brightness must be between 1 and 254")
    }

    try {
      const response = await axios.put(`${this.baseUrl}/groups/${zoneId}/action`, {
        bri: brightness,
        on: true,
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
   * Set light state (comprehensive control)
   */
  async setLightState(
    lightId: string,
    state: {
      on?: boolean
      bri?: number
      hue?: number
      sat?: number
      ct?: number
      xy?: [number, number]
      transitiontime?: number
    }
  ): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.put(
        `${this.baseUrl}/lights/${lightId}/state`,
        state
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Set zone state (comprehensive control)
   */
  async setZoneState(
    zoneId: string,
    state: {
      on?: boolean
      bri?: number
      hue?: number
      sat?: number
      ct?: number
      xy?: [number, number]
      scene?: string
      transitiontime?: number
    }
  ): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.put(
        `${this.baseUrl}/groups/${zoneId}/action`,
        state
      )

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
   * Get scenes for a specific zone (properly filtered)
   */
  async getScenesForZone(zoneId: string): Promise<HueScene[]> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const allScenes = await this.getScenes()
      const zone = await this.getZone(zoneId)
      const zoneLightIds = zone.lights

      // Filter scenes that belong to this zone
      const zoneScenes = Object.entries(allScenes)
        .filter(([_, scene]) => {
          // Check if scene is explicitly for this group
          if (scene.group === zoneId) return true
          // Check if all scene lights belong to this zone
          if (scene.lights.length > 0) {
            return scene.lights.every((lightId) => zoneLightIds.includes(lightId))
          }
          return false
        })
        .map(([id, scene]) => ({ ...scene, id }))

      return zoneScenes
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get all scenes with their zone information
   */
  async getAllScenesWithZones(): Promise<Array<HueScene & { zoneName?: string }>> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const [scenes, zones] = await Promise.all([
        this.getScenes(),
        this.getZones(),
      ])

      const zonesArray = Object.entries(zones).map(([id, zone]) => ({
        ...zone,
        id,
      }))

      return Object.entries(scenes).map(([id, scene]) => {
        const zone = zonesArray.find((z) => z.id === scene.group)
        return {
          ...scene,
          id,
          zoneName: zone?.name,
        }
      })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Find scene by name (case-insensitive partial match)
   */
  async findSceneByName(name: string): Promise<HueScene | null> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const scenes = await this.getScenes()
      const normalizedSearch = name.toLowerCase()

      const entry = Object.entries(scenes).find(([_, scene]) =>
        scene.name.toLowerCase().includes(normalizedSearch)
      )

      if (entry) {
        return { ...entry[1], id: entry[0] }
      }

      return null
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

  /**
   * Get lights for a zone with full details
   */
  async getLightsForZone(zoneId: string): Promise<HueLight[]> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const [zone, allLights] = await Promise.all([
        this.getZone(zoneId),
        this.getLights(),
      ])

      return zone.lights
        .filter((lightId) => allLights[lightId] !== undefined)
        .map((lightId) => {
          const light = allLights[lightId]
          return {
            ...light,
            id: lightId,
          } as HueLight
        })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get aggregate status for all lights
   */
  async getAllLightsStatus(): Promise<{
    totalLights: number
    lightsOn: number
    anyOn: boolean
    allOn: boolean
    averageBrightness: number
  }> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const lights = await this.getLights()
      const lightsArray = Object.values(lights)

      const lightsOn = lightsArray.filter((l) => l.state.on).length
      const onLights = lightsArray.filter((l) => l.state.on)
      const avgBrightness =
        onLights.length > 0
          ? Math.round(
              onLights.reduce((sum, l) => sum + (l.state.bri || 0), 0) /
                onLights.length
            )
          : 0

      return {
        totalLights: lightsArray.length,
        lightsOn,
        anyOn: lightsOn > 0,
        allOn: lightsOn === lightsArray.length,
        averageBrightness: avgBrightness,
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get all entertainment areas (for Hue Sync)
   */
  async getEntertainmentAreas(): Promise<
    Array<HueZone & { stream?: { proxymode: string; proxynode: string; active: boolean; owner?: string } }>
  > {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const groups = await this.getZones()
      const entertainmentAreas = Object.entries(groups)
        .filter(([_, group]) => group.type === "Entertainment")
        .map(([id, group]) => ({
          ...group,
          id,
        }))

      return entertainmentAreas
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get entertainment area by name (case-insensitive partial match)
   */
  async getEntertainmentAreaByName(
    name: string
  ): Promise<(HueZone & { stream?: { proxymode: string; proxynode: string; active: boolean; owner?: string } }) | null> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const areas = await this.getEntertainmentAreas()
      const normalizedSearch = name.toLowerCase()

      const area = areas.find((a) => a.name.toLowerCase().includes(normalizedSearch))

      return area || null
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get entertainment/sync status for an area
   */
  async getEntertainmentStatus(areaId: string): Promise<{
    active: boolean
    owner?: string
    proxymode?: string
  }> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.get(`${this.baseUrl}/groups/${areaId}`)
      const group = response.data

      return {
        active: group.stream?.active || false,
        owner: group.stream?.owner,
        proxymode: group.stream?.proxymode,
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HUE API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Toggle entertainment/streaming mode for an area
   * Note: This enables the entertainment API mode. The actual streaming
   * (sending colors) is done by Hue Sync app or Sync Box.
   * 
   * When active=false, this stops any active entertainment session,
   * returning lights to their previous state.
   */
  async setEntertainmentMode(areaId: string, active: boolean): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("HUE bridge not configured")
    }

    try {
      const response = await axios.put(`${this.baseUrl}/groups/${areaId}`, {
        stream: { active },
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
