/**
 * Desktop Service
 * Handles local desktop features (volume, performance, display switching, KVM)
 */

import type { PerformanceMetrics, VolumeState } from "@/lib/types/desktop.types"
import { DEFAULT_SETTINGS, settingsService } from "@/lib/services/settings.service"
import { config } from "@/lib/config"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// VCP code 60 input values (DDC/CI standard for input source)
// Dell U2713H & Alienware AW3423DWF both use: HDMI=17, DisplayPort=15
const INPUT_VALUES = {
  hdmi: "17",
  displayport: "15",
} as const

type DisplayInput = 'hdmi' | 'displayport'

export class DesktopService {
  /**
   * Check if desktop features are available (running on Windows)
   * Local mode detection is handled by the health check / connectivity provider
   */
  isAvailable(): boolean {
    return typeof process !== "undefined" && process.platform === "win32"
  }

  /**
   * Get current volume (Windows)
   */
  async getVolume(): Promise<VolumeState> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    try {
      // Use PowerShell to get volume
      const { stdout } = await execAsync(
        'powershell -Command "(New-Object -ComObject Shell.Application).NameSpace(17).ParseName(\'Control Panel\\Sound\').InvokeVerb(\'properties\')"'
      )

      // Alternative: Use nircmd or similar tool, or Windows API
      // For now, return a default state
      return {
        volume: 50,
        muted: false,
      }
    } catch (error) {
      // Fallback to default
      return {
        volume: 50,
        muted: false,
      }
    }
  }

  /**
   * Set volume (Windows)
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100")
    }

    try {
      // Use PowerShell to set volume
      await execAsync(
        `powershell -Command "(New-Object -ComObject Shell.Application).NameSpace(17).ParseName('Control Panel\\Sound').InvokeVerb('properties')"`
      )

      // Alternative: Use nircmd: nircmd.exe setsysvolume 32768
      // Or use Windows API via a Node.js addon
      // For now, this is a placeholder
    } catch (error) {
      throw new Error(`Failed to set volume: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Get system performance metrics
   */
  async getPerformance(): Promise<PerformanceMetrics> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    try {
      // Use PowerShell to get CPU and memory info
      const cpuCommand = 'powershell -Command "Get-WmiObject Win32_Processor | Measure-Object -property LoadPercentage -Average | Select-Object -ExpandProperty Average"'
      const memCommand = 'powershell -Command "$mem = Get-WmiObject Win32_OperatingSystem; [math]::Round((($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize) * 100, 2)"'

      const [cpuResult, memResult] = await Promise.all([
        execAsync(cpuCommand).catch(() => ({ stdout: "0" })),
        execAsync(memCommand).catch(() => ({ stdout: "0" })),
      ])

      const cpuUsage = parseFloat(cpuResult.stdout.trim()) || 0
      const memUsage = parseFloat(memResult.stdout.trim()) || 0

      // Get total memory
      const totalMemCommand = 'powershell -Command "(Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory"'
      const totalMemResult = await execAsync(totalMemCommand).catch(() => ({ stdout: "0" }))
      const totalMem = parseFloat(totalMemResult.stdout.trim()) || 8589934592 // Default 8GB

      return {
        cpu: {
          usage: cpuUsage,
          cores: require("os").cpus().length,
        },
        memory: {
          used: totalMem * (memUsage / 100),
          total: totalMem,
          usage: memUsage,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Get display configuration from settings
   */
  private async getDisplayConfig() {
    try {
      const settings = await settingsService.getSettings()
      return {
        monitor: settings?.display_monitor ?? DEFAULT_SETTINGS.display_monitor,
        primaryInput: (settings?.display_primary_input ?? DEFAULT_SETTINGS.display_primary_input) as DisplayInput,
        secondaryInput: (settings?.display_secondary_input ?? DEFAULT_SETTINGS.display_secondary_input) as DisplayInput,
      }
    } catch (error) {
      console.error('Failed to get display settings, using defaults:', error)
      return {
        monitor: DEFAULT_SETTINGS.display_monitor,
        primaryInput: DEFAULT_SETTINGS.display_primary_input as DisplayInput,
        secondaryInput: DEFAULT_SETTINGS.display_secondary_input as DisplayInput,
      }
    }
  }

  /**
   * Switch display to the opposite input (toggle between primary and secondary)
   */
  async switchDisplay(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    try {
      const currentInput = await this.getDisplayInput()
      const config = await this.getDisplayConfig()

      // Toggle to the opposite input
      const targetInput = currentInput === config.primaryInput
        ? config.secondaryInput
        : config.primaryInput

      await this.switchToInput(targetInput)
    } catch (error) {
      throw new Error(`Failed to switch display: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Get current display input (HDMI, DisplayPort, or unknown)
   * Reads directly from the monitor using ControlMyMonitor
   */
  async getDisplayInput(): Promise<'hdmi' | 'displayport' | 'unknown'> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    try {
      const displayConfig = await this.getDisplayConfig()
      const toolPath = config.desktop.controlMyMonitorPath
      const command = `"${toolPath}" /GetValue "${displayConfig.monitor}" 60`
      const { stdout } = await execAsync(command)
      const value = stdout.trim()

      if (value === INPUT_VALUES.hdmi) return 'hdmi'
      if (value === INPUT_VALUES.displayport) return 'displayport'
      return 'unknown'
    } catch (error) {
      console.error('Failed to get display input:', error)
      return 'unknown'
    }
  }

  /**
   * Switch display to a specific input
   */
  async switchToInput(input: DisplayInput): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    try {
      const displayConfig = await this.getDisplayConfig()
      const toolPath = config.desktop.controlMyMonitorPath
      const value = INPUT_VALUES[input]
      const command = `"${toolPath}" /SetValue "${displayConfig.monitor}" 60 ${value}`
      await execAsync(command)
    } catch (error) {
      throw new Error(`Failed to switch to ${input}: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Switch display input to HDMI
   */
  async switchToHdmi(): Promise<void> {
    await this.switchToInput('hdmi')
  }

  /**
   * Switch display input to DisplayPort
   */
  async switchToDisplayPort(): Promise<void> {
    await this.switchToInput('displayport')
  }

  /**
   * Get the current display configuration (for UI display)
   */
  async getDisplayConfiguration() {
    return this.getDisplayConfig()
  }
}
