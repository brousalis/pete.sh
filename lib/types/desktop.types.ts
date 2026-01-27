/**
 * TypeScript types for Local Desktop Features
 */

export interface VolumeState {
  volume: number // 0-100
  muted: boolean
}

export interface PerformanceMetrics {
  cpu: {
    usage: number // percentage
    temperature?: number // celsius
    cores?: number
  }
  memory: {
    used: number // bytes
    total: number // bytes
    usage: number // percentage
  }
  gpu?: {
    usage: number // percentage
    temperature?: number // celsius
    memory?: {
      used: number // bytes
      total: number // bytes
    }
  }
  disk?: {
    read: number // bytes per second
    write: number // bytes per second
  }
  timestamp: string
}

export interface DisplayState {
  currentInput: "displayport" | "hdmi" | "vga" | "dvi"
  availableInputs: Array<"displayport" | "hdmi" | "vga" | "dvi">
}

export interface DesktopStatus {
  volume: VolumeState
  performance?: PerformanceMetrics
  display?: DisplayState
  isAvailable: boolean
}
