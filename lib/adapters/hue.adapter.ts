/**
 * Hue Adapter
 * Handles Philips Hue data with write-through caching to Supabase
 * 
 * Local mode: Fetches from Hue bridge, writes to Supabase
 * Production mode: Reads from Supabase cache
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp } from './base.adapter'
import { HueService } from '@/lib/services/hue.service'
import type { HueLight, HueZone, HueScene, HueAllLightsStatus } from '@/lib/types/hue.types'
import type { 
  HueLightRow, 
  HueZoneRow, 
  HueSceneRow, 
  HueStatusRow,
  HueLightInsert,
  HueZoneInsert,
  HueSceneInsert,
  HueStatusInsert
} from '@/lib/supabase/types'

// Interfaces for the combined Hue data
export interface HueFullState {
  lights: Record<string, HueLight>
  zones: HueZone[]
  scenes: HueScene[]
  status: HueAllLightsStatus
}

export interface HueCachedState {
  lights: HueLightRow[]
  zones: HueZoneRow[]
  scenes: HueSceneRow[]
  status: HueStatusRow | null
  recordedAt: string
}

/**
 * Hue Adapter - manages all Hue-related data
 */
export class HueAdapter extends BaseAdapter<HueFullState, HueCachedState> {
  private hueService: HueService

  constructor(debug: boolean = false) {
    super({ serviceName: 'hue', debug })
    this.hueService = new HueService()
  }

  /**
   * Check if Hue bridge is configured
   */
  isConfigured(): boolean {
    return this.hueService.isConfigured()
  }

  /**
   * Fetch all Hue data from the bridge
   */
  protected async fetchFromService(): Promise<HueFullState> {
    if (!this.isConfigured()) {
      throw new Error('Hue bridge not configured')
    }

    const [lights, zones, scenes, status] = await Promise.all([
      this.hueService.getLights(),
      this.hueService.getZones(),
      this.hueService.getScenes(),
      this.hueService.getAllLightsStatus(),
    ])

    // Convert zones object to array with IDs
    const zonesArray = Object.entries(zones)
      .map(([id, zone]) => ({ ...zone, id }))
      .filter(z => z.type === 'Room' || z.type === 'Zone')

    // Convert scenes object to array with IDs
    const scenesArray = Object.entries(scenes)
      .map(([id, scene]) => ({ ...scene, id }))

    return {
      lights,
      zones: zonesArray,
      scenes: scenesArray,
      status,
    }
  }

  /**
   * Fetch cached Hue data from Supabase
   */
  protected async fetchFromCache(): Promise<HueCachedState | null> {
    const client = this.getReadClient()
    if (!client) return null // Supabase not configured

    try {
      // Fetch latest lights, zones, scenes, and status in parallel
      const [lightsResult, zonesResult, scenesResult, statusResult] = await Promise.all([
        client.rpc('get_latest_hue_lights'),
        client.rpc('get_latest_hue_zones'),
        client.rpc('get_latest_hue_scenes'),
        client.rpc('get_latest_hue_status'),
      ])

      if (lightsResult.error) throw lightsResult.error
      if (zonesResult.error) throw zonesResult.error
      if (scenesResult.error) throw scenesResult.error
      if (statusResult.error) throw statusResult.error

      const lights = (lightsResult.data ?? []) as HueLightRow[]
      const zones = (zonesResult.data ?? []) as HueZoneRow[]
      const scenes = (scenesResult.data ?? []) as HueSceneRow[]
      const status = statusResult.data as HueStatusRow | null

      // Determine the most recent recorded_at
      const timestamps = [
        ...lights.map(l => l.recorded_at),
        ...zones.map(z => z.recorded_at),
        ...scenes.map(s => s.recorded_at),
        status?.recorded_at,
      ].filter(Boolean) as string[]

      const recordedAt = timestamps.length > 0 
        ? timestamps.sort().reverse()[0] 
        : new Date().toISOString()

      return {
        lights,
        zones,
        scenes,
        status,
        recordedAt,
      }
    } catch (error) {
      this.logError('Error fetching from cache', error)
      return null
    }
  }

  /**
   * Write Hue data to Supabase
   */
  protected async writeToCache(data: HueFullState): Promise<SyncResult> {
    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    const timestamp = getCurrentTimestamp()
    let recordsWritten = 0

    try {
      // Write lights
      const lightInserts: HueLightInsert[] = Object.entries(data.lights).map(([id, light]) => ({
        light_id: id,
        name: light.name,
        type: light.type,
        model_id: light.modelid,
        product_name: light.productname,
        state: light.state,
        is_on: light.state.on,
        brightness: light.state.bri ?? null,
        is_reachable: light.state.reachable,
        recorded_at: timestamp,
      }))

      if (lightInserts.length > 0) {
        const { error: lightsError } = await client
          .from('hue_lights')
          .insert(lightInserts)
        
        if (lightsError) throw lightsError
        recordsWritten += lightInserts.length
      }

      // Write zones
      const zoneInserts: HueZoneInsert[] = data.zones.map(zone => ({
        zone_id: zone.id,
        name: zone.name,
        type: zone.type,
        class: zone.class ?? null,
        lights: zone.lights,
        state: zone.state,
        action: zone.action ?? null,
        any_on: zone.state.any_on,
        all_on: zone.state.all_on,
        recorded_at: timestamp,
      }))

      if (zoneInserts.length > 0) {
        const { error: zonesError } = await client
          .from('hue_zones')
          .insert(zoneInserts)
        
        if (zonesError) throw zonesError
        recordsWritten += zoneInserts.length
      }

      // Write scenes
      const sceneInserts: HueSceneInsert[] = data.scenes.map(scene => ({
        scene_id: scene.id,
        name: scene.name,
        type: scene.type,
        zone_id: scene.group ?? null,
        zone_name: scene.zoneName ?? null,
        lights: scene.lights,
        owner: scene.owner ?? null,
        recycle: scene.recycle ?? false,
        locked: scene.locked ?? false,
        recorded_at: timestamp,
      }))

      if (sceneInserts.length > 0) {
        const { error: scenesError } = await client
          .from('hue_scenes')
          .insert(sceneInserts)
        
        if (scenesError) throw scenesError
        recordsWritten += sceneInserts.length
      }

      // Write status
      const statusInsert: HueStatusInsert = {
        total_lights: data.status.totalLights,
        lights_on: data.status.lightsOn,
        any_on: data.status.anyOn,
        all_on: data.status.allOn,
        average_brightness: data.status.averageBrightness,
        recorded_at: timestamp,
      }

      const { error: statusError } = await client
        .from('hue_status')
        .insert(statusInsert)
      
      if (statusError) throw statusError
      recordsWritten += 1

      return { success: true, recordsWritten }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logError('Error writing to cache', error)
      return { success: false, recordsWritten, error: errorMessage }
    }
  }

  // ==========================================
  // High-level API methods
  // ==========================================

  /**
   * Get all lights status
   */
  async getAllLightsStatus(): Promise<HueAllLightsStatus | null> {
    if (this.isLocal()) {
      try {
        const status = await this.hueService.getAllLightsStatus()
        
        // Write to cache in background (only if Supabase is configured)
        if (this.isSupabaseAvailable()) {
          const client = this.getWriteClient()
          if (client) {
            const timestamp = getCurrentTimestamp()
            client
              .from('hue_status')
              .insert({
                total_lights: status.totalLights,
                lights_on: status.lightsOn,
                any_on: status.anyOn,
                all_on: status.allOn,
                average_brightness: status.averageBrightness,
                recorded_at: timestamp,
              })
              .then(({ error }) => {
                if (error) this.logError('Failed to cache status', error)
              })
          }
        }

        return status
      } catch (error) {
        this.logError('Error fetching status', error)
        throw error
      }
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached?.status) return null

    return {
      totalLights: cached.status.total_lights,
      lightsOn: cached.status.lights_on,
      anyOn: cached.status.any_on,
      allOn: cached.status.all_on,
      averageBrightness: cached.status.average_brightness,
    }
  }

  /**
   * Get all lights
   */
  async getLights(): Promise<Record<string, HueLight>> {
    if (this.isLocal()) {
      return this.hueService.getLights()
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached) return {}

    const lights: Record<string, HueLight> = {}
    for (const row of cached.lights) {
      lights[row.light_id] = {
        id: row.light_id,
        name: row.name,
        type: row.type ?? '',
        modelid: row.model_id ?? '',
        manufacturername: '',
        productname: row.product_name ?? '',
        state: row.state,
        capabilities: { control: { mindimlevel: 0, maxlumen: 0 } },
      }
    }
    return lights
  }

  /**
   * Get all zones
   */
  async getZones(): Promise<Record<string, HueZone>> {
    if (this.isLocal()) {
      return this.hueService.getZones()
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached) return {}

    const zones: Record<string, HueZone> = {}
    for (const row of cached.zones) {
      zones[row.zone_id] = {
        id: row.zone_id,
        name: row.name,
        type: row.type ?? '',
        class: row.class ?? undefined,
        lights: row.lights,
        state: row.state,
        action: row.action ?? undefined,
      }
    }
    return zones
  }

  /**
   * Get all scenes
   */
  async getScenes(): Promise<Record<string, HueScene>> {
    if (this.isLocal()) {
      return this.hueService.getScenes()
    }

    // Production mode - read from cache
    const cached = await this.fetchFromCache()
    if (!cached) return {}

    const scenes: Record<string, HueScene> = {}
    for (const row of cached.scenes) {
      scenes[row.scene_id] = {
        id: row.scene_id,
        name: row.name,
        type: row.type ?? '',
        group: row.zone_id ?? undefined,
        zoneName: row.zone_name ?? undefined,
        lights: row.lights,
        owner: row.owner ?? undefined,
        recycle: row.recycle,
        locked: row.locked,
      }
    }
    return scenes
  }

  /**
   * Get scenes for a specific zone
   */
  async getScenesForZone(zoneId: string): Promise<HueScene[]> {
    if (this.isLocal()) {
      return this.hueService.getScenesForZone(zoneId)
    }

    // Production mode - filter cached scenes
    const scenes = await this.getScenes()
    return Object.values(scenes).filter(scene => scene.group === zoneId)
  }

  /**
   * Get a specific zone
   */
  async getZone(zoneId: string): Promise<HueZone | null> {
    const zones = await this.getZones()
    return zones[zoneId] ?? null
  }

  /**
   * Get lights for a specific zone
   */
  async getLightsForZone(zoneId: string): Promise<HueLight[]> {
    if (this.isLocal()) {
      return this.hueService.getLightsForZone(zoneId)
    }

    // Production mode - get zone and filter lights
    const [zone, allLights] = await Promise.all([
      this.getZone(zoneId),
      this.getLights(),
    ])

    if (!zone) return []

    return zone.lights
      .filter(lightId => allLights[lightId] !== undefined)
      .map(lightId => ({ ...allLights[lightId], id: lightId }))
  }

  /**
   * Get entertainment areas
   */
  async getEntertainmentAreas(): Promise<HueZone[]> {
    if (this.isLocal()) {
      return this.hueService.getEntertainmentAreas()
    }

    // Production mode - filter cached zones
    const zones = await this.getZones()
    return Object.values(zones).filter(z => z.type === 'Entertainment')
  }

  /**
   * Get entertainment status for an area
   */
  async getEntertainmentStatus(areaId: string): Promise<{ active: boolean; owner?: string; proxymode?: string }> {
    if (this.isLocal()) {
      return this.hueService.getEntertainmentStatus(areaId)
    }

    // Production mode - return inactive (can't know real status)
    return { active: false }
  }

  // ==========================================
  // Mutation methods (local mode only)
  // These delegate to the real service
  // ==========================================

  async toggleLight(lightId: string, on?: boolean): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.toggleLight(lightId, on)
  }

  async toggleZone(zoneId: string, on?: boolean): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.toggleZone(zoneId, on)
  }

  async toggleAllLights(on: boolean): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.toggleAllLights(on)
  }

  async setBrightness(lightId: string, brightness: number): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.setBrightness(lightId, brightness)
  }

  async setZoneBrightness(zoneId: string, brightness: number): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.setZoneBrightness(zoneId, brightness)
  }

  async setAllBrightness(brightness: number): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.setAllBrightness(brightness)
  }

  async activateScene(zoneId: string, sceneId: string): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.activateScene(zoneId, sceneId)
  }

  async setLightState(lightId: string, state: Parameters<HueService['setLightState']>[1]): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.setLightState(lightId, state)
  }

  async setZoneState(zoneId: string, state: Parameters<HueService['setZoneState']>[1]): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.setZoneState(zoneId, state)
  }

  async setEntertainmentMode(areaId: string, active: boolean): Promise<unknown> {
    if (!this.isLocal()) throw new Error('Controls only available in local mode')
    return this.hueService.setEntertainmentMode(areaId, active)
  }
}

// Export singleton instance
let hueAdapterInstance: HueAdapter | null = null

export function getHueAdapter(): HueAdapter {
  if (!hueAdapterInstance) {
    hueAdapterInstance = new HueAdapter()
  }
  return hueAdapterInstance
}
