/**
 * setlist.fm API Service
 * Handles communication with the setlist.fm REST API for concert setlists
 */

import { config } from '@/lib/config'
import type {
    SetlistData,
    SetlistFMArtist,
    SetlistFMArtistSearchResult,
    SetlistFMSetlist,
    SetlistFMSetlistSearchResult,
    SetlistSet,
} from '@/lib/types/concerts.types'
import axios from 'axios'

const SETLISTFM_BASE_URL = 'https://api.setlist.fm/rest/1.0'

export class SetlistFMService {
  private apiKey: string

  constructor() {
    this.apiKey = config.concerts.setlistfmApiKey || ''
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  private getHeaders() {
    return {
      Accept: 'application/json',
      'x-api-key': this.apiKey,
    }
  }

  /**
   * Search for artists by name to resolve MusicBrainz ID
   */
  async searchArtists(name: string): Promise<SetlistFMArtist[]> {
    if (!this.isConfigured()) {
      throw new Error('setlist.fm API key not configured')
    }

    try {
      const response = await axios.get<SetlistFMArtistSearchResult>(
        `${SETLISTFM_BASE_URL}/search/artists`,
        {
          headers: this.getHeaders(),
          params: {
            artistName: name,
            sort: 'relevance',
          },
        }
      )

      return response.data.artist || []
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) return []
        throw new Error(`setlist.fm API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Get an artist by MusicBrainz ID
   */
  async getArtist(mbid: string): Promise<SetlistFMArtist | null> {
    if (!this.isConfigured()) {
      throw new Error('setlist.fm API key not configured')
    }

    try {
      const response = await axios.get<SetlistFMArtist>(
        `${SETLISTFM_BASE_URL}/artist/${mbid}`,
        { headers: this.getHeaders() }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Search setlists by artist MusicBrainz ID and optional date
   */
  async searchSetlists(
    artistMbid: string,
    date?: string // YYYY-MM-DD format
  ): Promise<SetlistFMSetlist[]> {
    if (!this.isConfigured()) {
      throw new Error('setlist.fm API key not configured')
    }

    try {
      const params: Record<string, string> = {
        artistMbid,
      }

      // setlist.fm uses dd-MM-yyyy format
      if (date) {
        const [year, month, day] = date.split('-')
        params.date = `${day}-${month}-${year}`
      }

      const response = await axios.get<SetlistFMSetlistSearchResult>(
        `${SETLISTFM_BASE_URL}/search/setlists`,
        {
          headers: this.getHeaders(),
          params,
        }
      )

      return response.data.setlist || []
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) return []
        throw new Error(`setlist.fm API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Search setlists by artist name and date (convenience method)
   * Resolves the artist to a MusicBrainz ID first
   */
  async searchSetlistsByName(
    artistName: string,
    date?: string
  ): Promise<{ setlists: SetlistFMSetlist[]; mbid: string | null }> {
    const artists = await this.searchArtists(artistName)
    const firstArtist = artists[0]
    if (!firstArtist) {
      return { setlists: [], mbid: null }
    }

    const mbid = firstArtist.mbid
    const setlists = await this.searchSetlists(mbid, date)
    return { setlists, mbid }
  }

  /**
   * Get a specific setlist by ID
   */
  async getSetlist(setlistId: string): Promise<SetlistFMSetlist | null> {
    if (!this.isConfigured()) {
      throw new Error('setlist.fm API key not configured')
    }

    try {
      const response = await axios.get<SetlistFMSetlist>(
        `${SETLISTFM_BASE_URL}/setlist/${setlistId}`,
        { headers: this.getHeaders() }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Get setlists for an artist (by MusicBrainz ID) with pagination
   */
  async getArtistSetlists(
    mbid: string,
    page: number = 1
  ): Promise<SetlistFMSetlistSearchResult> {
    if (!this.isConfigured()) {
      throw new Error('setlist.fm API key not configured')
    }

    const response = await axios.get<SetlistFMSetlistSearchResult>(
      `${SETLISTFM_BASE_URL}/artist/${mbid}/setlists`,
      {
        headers: this.getHeaders(),
        params: { p: page },
      }
    )
    return response.data
  }

  /**
   * Normalize a setlist.fm setlist response into our internal SetlistData format
   */
  normalizeSetlist(raw: SetlistFMSetlist): SetlistData {
    const sets: SetlistSet[] = (raw.sets?.set || []).map((s) => ({
      name: s.name,
      encore: s.encore,
      song: (s.song || []).map((song) => ({
        name: song.name,
        info: song.info,
        cover: song.cover
          ? {
              mbid: song.cover.mbid,
              name: song.cover.name,
              sortName: song.cover.sortName,
            }
          : undefined,
        tape: song.tape,
        with: song.with
          ? {
              mbid: song.with.mbid,
              name: song.with.name,
              sortName: song.with.sortName,
            }
          : undefined,
      })),
    }))

    return {
      id: raw.id,
      eventDate: raw.eventDate,
      artist: {
        mbid: raw.artist.mbid,
        name: raw.artist.name,
        sortName: raw.artist.sortName,
        url: raw.artist.url,
      },
      venue: {
        id: raw.venue.id,
        name: raw.venue.name,
        city: {
          id: raw.venue.city.id,
          name: raw.venue.city.name,
          state: raw.venue.city.state,
          stateCode: raw.venue.city.stateCode,
          country: raw.venue.city.country,
        },
        url: raw.venue.url,
      },
      tour: raw.tour,
      sets,
      url: raw.url,
      lastUpdated: raw.lastUpdated,
    }
  }
}
