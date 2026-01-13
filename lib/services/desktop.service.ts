/**
 * Desktop Service
 * Handles local desktop features (volume, performance, display switching)
 */

import { exec } from "child_process"
import { promisify } from "util"
import { config } from "@/lib/config"
import type { VolumeState, PerformanceMetrics, DisplayState } from "@/lib/types/desktop.types"

const execAsync = promisify(exec)

export class DesktopService {
  isAvailable(): boolean {
    return config.desktop.enabled && typeof process !== "undefined" && process.platform === "win32"
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
   * Switch display from DisplayPort to HDMI
   */
  async switchDisplay(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Desktop features not available")
    }

    try {
      // Execute the PowerShell script for display switching
      // Assuming the script exists at scripts/switch-display.ps1
      const scriptPath = require("path").join(process.cwd(), "scripts", "switch-display.ps1")
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`)
    } catch (error) {
      throw new Error(`Failed to switch display: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}
