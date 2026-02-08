/**
 * Hue Adapter
 * Handles Philips Hue data with write-through caching to Supabase
 * 
 * Auto-detects mode based on Hue bridge reachability:
 * - Bridge reachable: Fetches from Hue bridge, writes to Supabase
 * - Bridge unreachable: Reads from Supabase cache
 * 
 * Sync Strategy:
 * - Lights and zones: sync every 5 minutes or when state changes (on/off, brightness)
 * - Scenes: sync hourly (they rarely change, mostly static configuration)
 * - Status: sync with lights/zones
 */

import { BaseAdapter, SyncResult, getCurrentTimestamp, AVAILABILITY_CHECK_TIMEOUT } from './base.adapter'
import { HueService } from '@/lib/services/hue.service'
import { config } from '@/lib/config'
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

/** Scene-only state for separate sync */
export interface HueSceneState {
  scenes: HueScene[]
}

/** Track last scene sync separately (1 hour interval) */
let lastSceneSyncTime: Date | null = null
const SCENE_SYNC_INTERVAL = 60 * 60 * 1000 // 1 hour

/** Track last scene hash for change detection */
let lastSceneHash: string | null = null

/**
 * Hue Adapter - manages all Hue-related data
 * 
 * Uses change detection to minimize unnecessary database writes:
 * - Lights/zones: writes on state change or every 5 minutes
 * - Scenes: writes on change or every 1 hour (static configuration)
 */
export class HueAdapter extends BaseAdapter<HueFullState, HueCachedState> {
  private hueService: HueService

  constructor(debug: boolean = false) {
    // 5 minute minimum write interval for Hue state
    super({ serviceName: 'hue', debug, minWriteInterval: 5 * 60 * 1000 })
    this.hueService = new HueService()
  }

  /**
   * Compute a hash of Hue data based on meaningful state changes
   * Only considers on/off state, brightness, and zone states
   * Ignores timestamps and other volatile data
   */
  protected computeDataHash(data: HueFullState): string {
    const significantData = {
      lights: Object.entries(data.lights).map(([id, light]) => ({
        id,
        on: light.state.on,
        bri: light.state.bri,
        reachable: light.state.reachable,
      })).sort((a, b) => a.id.localeCompare(b.id)),
      zones: data.zones.map(zone => ({
        id: zone.id,
        any_on: zone.state.any_on,
        all_on: zone.state.all_on,
      })).sort((a, b) => a.id.localeCompare(b.id)),
      status: {
        lightsOn: data.status.lightsOn,
        anyOn: data.status.anyOn,
        allOn: data.status.allOn,
      },
    }
    return JSON.stringify(significantData)
  }

  /**
   * Compute hash for scenes (separate from state)
   * Only considers scene IDs and names
   */
  private computeSceneHash(scenes: HueScene[]): string {
    const sceneData = scenes.map(s => ({
      id: s.id,
      name: s.name,
      group: s.group,
    })).sort((a, b) => a.id.localeCompare(b.id))
    return JSON.stringify(sceneData)
  }

  /**
   * Check if scenes have changed since last sync
   */
  private haveScenesChanged(scenes: HueScene[]): boolean {
    const newHash = this.computeSceneHash(scenes)
    if (!lastSceneHash) return true
    return lastSceneHash !== newHash
  }

  /**
   * Check if enough time has passed for scene sync
   */
  private shouldSyncScenes(): boolean {
    if (!lastSceneSyncTime) return true
    const timeSinceLastSync = Date.now() - lastSceneSyncTime.getTime()
    return timeSinceLastSync >= SCENE_SYNC_INTERVAL
  }

  /**
   * Record scene sync timestamp and hash
   */
  private recordSceneSync(scenes: HueScene[]): void {
    lastSceneSyncTime = new Date()
    lastSceneHash = this.computeSceneHash(scenes)
  }

  /**
   * Check if Hue bridge is configured (has IP and username)
   */
  isConfigured(): boolean {
    return this.hueService.isConfigured()
  }

  /**
   * Check if Hue bridge is reachable
   * Used for auto-detection of local vs production mode
   */
  protected async checkServiceAvailability(): Promise<boolean> {
    // If not configured, definitely not available
    if (!this.isConfigured()) {
      return false
    }

    try {
      const bridgeIp = config.hue.bridgeIp
      const username = config.hue.username
      
      if (!bridgeIp || !username) {
        return false
      }

      // Quick ping to the bridge config endpoint (doesn't require auth for basic info)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AVAILABILITY_CHECK_TIMEOUT)

      const response = await fetch(`http://${bridgeIp}/api/${username}/config`, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Bridge is available if we get a valid response
      return response.ok
    } catch {
      // Any error means bridge is not reachable
      return false
    }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any
      const [lightsResult, zonesResult, scenesResult, statusResult] = await Promise.all([
        clientAny.rpc('get_latest_hue_lights'),
        clientAny.rpc('get_latest_hue_zones'),
        clientAny.rpc('get_latest_hue_scenes'),
        clientAny.rpc('get_latest_hue_status'),
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
        ? timestamps.sort().reverse()[0]! 
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
   * Separates scene syncing from state syncing for better efficiency
   * 
   * @param data The full Hue state
   * @param options.includeScenes Whether to include scenes in this sync (default: based on time/change detection)
   */
  protected async writeToCache(data: HueFullState, options?: { includeScenes?: boolean }): Promise<SyncResult> {
    const client = this.getWriteClient()
    if (!client) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }
    const timestamp = getCurrentTimestamp()
    let recordsWritten = 0

    // Determine if we should sync scenes
    const shouldIncludeScenes = options?.includeScenes ?? 
      (this.shouldSyncScenes() || this.haveScenesChanged(data.scenes))

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any

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
        const { error: lightsError } = await clientAny
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
        const { error: zonesError } = await clientAny
          .from('hue_zones')
          .insert(zoneInserts)
        
        if (zonesError) throw zonesError
        recordsWritten += zoneInserts.length
      }

      // Only write scenes if needed (hourly or on change)
      if (shouldIncludeScenes) {
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
          const { error: scenesError } = await clientAny
            .from('hue_scenes')
            .insert(sceneInserts)
          
          if (scenesError) throw scenesError
          recordsWritten += sceneInserts.length
          this.recordSceneSync(data.scenes)
          this.log(`Synced ${sceneInserts.length} scenes`)
        }
      } else {
        this.log('Skipping scene sync (no changes, not due yet)')
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

      const { error: statusError } = await clientAny
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

  /**
   * Force sync scenes (useful for manual refresh)
   */
  async syncScenes(): Promise<SyncResult> {
    if (!this.isSupabaseAvailable()) {
      return { success: false, recordsWritten: 0, error: 'Supabase not configured' }
    }

    const isLocal = await this.isLocal()
    if (!isLocal) {
      return { success: false, recordsWritten: 0, error: 'Scene sync only available in local mode' }
    }

    try {
      const scenes = await this.hueService.getScenes()
      const scenesArray = Object.entries(scenes)
        .map(([id, scene]) => ({ ...scene, id }))

      // Check if scenes have changed
      if (!this.haveScenesChanged(scenesArray) && !this.shouldSyncScenes()) {
        this.log('Skipping scene sync - no changes detected')
        return { success: true, recordsWritten: 0, skipped: true }
      }

      const client = this.getWriteClient()
      if (!client) {
        return { success: false, recordsWritten: 0, error: 'Supabase client not available' }
      }

      const timestamp = getCurrentTimestamp()
      const sceneInserts: HueSceneInsert[] = scenesArray.map(scene => ({
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any)
        .from('hue_scenes')
        .insert(sceneInserts)

      if (error) throw error

      this.recordSceneSync(scenesArray)
      return { success: true, recordsWritten: sceneInserts.length }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logError('Error syncing scenes', error)
      return { success: false, recordsWritten: 0, error: errorMessage }
    }
  }

  // ==========================================
  // High-level API methods
  // ==========================================

  /**
   * Get all lights status
   * Note: Does NOT write to cache on every fetch. Use refreshCache() for explicit sync.
   */
  async getAllLightsStatus(): Promise<HueAllLightsStatus | null> {
    const isLocal = await this.isLocal()
    
    if (isLocal) {
      try {
        return await this.hueService.getAllLightsStatus()
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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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
      .map(lightId => {
        const light = allLights[lightId]!
        return { ...light, id: lightId }
      })
  }

  /**
   * Get entertainment areas
   */
  async getEntertainmentAreas(): Promise<HueZone[]> {
    const isLocal = await this.isLocal()
    
    if (isLocal) {
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
    const isLocal = await this.isLocal()
    
    if (isLocal) {
      return this.hueService.getEntertainmentStatus(areaId)
    }

    // Production mode - return inactive (can't know real status)
    return { active: false }
  }

  // ==========================================
  // Mutation methods (local mode only)
  // Use isLocalSync() since by the time controls are enabled,
  // the availability check has already been cached
  // ==========================================

  async toggleLight(lightId: string, on?: boolean): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.toggleLight(lightId, on)
  }

  async toggleZone(zoneId: string, on?: boolean): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.toggleZone(zoneId, on)
  }

  async toggleAllLights(on: boolean): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.toggleAllLights(on)
  }

  async setBrightness(lightId: string, brightness: number): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.setBrightness(lightId, brightness)
  }

  async setZoneBrightness(zoneId: string, brightness: number): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.setZoneBrightness(zoneId, brightness)
  }

  async setAllBrightness(brightness: number): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.setAllBrightness(brightness)
  }

  async activateScene(zoneId: string, sceneId: string): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.activateScene(zoneId, sceneId)
  }

  async setLightState(lightId: string, state: Parameters<HueService['setLightState']>[1]): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.setLightState(lightId, state)
  }

  async setZoneState(zoneId: string, state: Parameters<HueService['setZoneState']>[1]): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
    return this.hueService.setZoneState(zoneId, state)
  }

  async setEntertainmentMode(areaId: string, active: boolean): Promise<unknown> {
    if (!this.isLocalSync()) throw new Error('Controls only available when local services are reachable')
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
