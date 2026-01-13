/**
 * Sonos Service
 * Handles communication with Sonos devices
 */

import axios from "axios"
import { config } from "@/lib/config"
import type { SonosPlayer, SonosState } from "@/lib/types/sonos.types"

export class SonosService {
  private baseUrl: string

  constructor() {
    this.baseUrl = config.sonos.apiUrl || "http://localhost:5005"
  }

  isConfigured(): boolean {
    return Boolean(config.sonos.apiUrl)
  }

  /**
   * Get all Sonos players
   */
  async getPlayers(): Promise<SonosPlayer[]> {
    try {
      const response = await axios.get<SonosPlayer[]>(`${this.baseUrl}/zones`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get player state
   */
  async getPlayerState(playerId: string): Promise<SonosState> {
    try {
      const response = await axios.get<SonosState>(`${this.baseUrl}/${playerId}/state`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Play music on a player
   */
  async play(playerId: string): Promise<unknown> {
    try {
      const response = await axios.post(`${this.baseUrl}/${playerId}/play`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Pause music on a player
   */
  async pause(playerId: string): Promise<unknown> {
    try {
      const response = await axios.post(`${this.baseUrl}/${playerId}/pause`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Set volume for a player
   */
  async setVolume(playerId: string, volume: number): Promise<unknown> {
    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100")
    }

    try {
      const response = await axios.post(`${this.baseUrl}/${playerId}/volume/${volume}`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Play Spotify on a player
   */
  async playSpotify(playerId: string, spotifyUri: string): Promise<unknown> {
    try {
      const response = await axios.post(`${this.baseUrl}/${playerId}/spotify/now/${spotifyUri}`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get current track info
   */
  async getCurrentTrack(playerId: string): Promise<SonosState["currentTrack"]> {
    try {
      const state = await this.getPlayerState(playerId)
      return state.currentTrack
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Sonos API error: ${error.message}`)
      }
      throw error
    }
  }
}
