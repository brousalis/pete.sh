/**
 * TypeScript types for HUE Bridge integration
 */

export interface HueLight {
  id: string
  name: string
  type: string
  state: {
    on: boolean
    bri: number // Brightness 0-254
    hue?: number
    sat?: number
    xy?: [number, number]
    ct?: number
    alert: string
    effect?: string
    colormode?: string
    reachable: boolean
  }
  modelid: string
  manufacturername: string
  productname: string
  capabilities: {
    control: {
      mindimlevel: number
      maxlumen: number
      colorgamuttype?: string
      colorgamut?: [[number, number], [number, number], [number, number]]
      ct?: {
        min: number
        max: number
      }
    }
  }
}

export interface HueZone {
  id: string
  name: string
  type: string
  class?: string
  lights: string[]
  sensors?: unknown[]
  state: {
    all_on: boolean
    any_on: boolean
  }
  recycle?: boolean
  metadata?: {
    name: string
    archetype?: string
  }
}

export interface HueScene {
  id: string
  name: string
  type: string
  group?: string
  lights: string[]
  owner?: string
  recycle?: boolean
  locked?: boolean
  appdata?: {
    version?: number
    data?: string
  }
  picture?: string
  lastupdated?: string
  version?: number
}

export interface HueBridgeConfig {
  name: string
  datastoreversion: string
  swversion: string
  apiversion: string
  mac: string
  bridgeid: string
  factorynew: boolean
  replacesbridgeid?: string
  modelid: string
  starterkitid?: string
}

export interface HueApiResponse<T> {
  success?: boolean
  error?: {
    type: number
    address: string
    description: string
  }
  data?: T
}
