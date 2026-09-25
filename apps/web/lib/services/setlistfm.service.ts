/**
 * setlist.fm API client (playlist consensus script).
 */

import { config } from '@/lib/config'
import type {
  SetlistData,
  SetlistFMArtist,
  SetlistFMArtistSearchResult,
  SetlistFMSetlist,
  SetlistFMSetlistSearchResult,
  SetlistSet,
} from '@/lib/types/setlistfm.types'

const SETLISTFM_BASE_URL = 'https://api.setlist.fm/rest/1.0'
const MAX_RETRIES = 5
const MIN_REQUEST_GAP_MS = 600

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class SetlistFMService {
  private apiKey: string
  private lastRequestAt = 0

  constructor() {
    // Prefer process.env so scripts can dotenv-load before constructing,
    // even if config.ts was evaluated earlier with an empty env.
    this.apiKey =
      process.env.SETLISTFM_API_KEY || config.concerts.setlistfmApiKey || ''
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'x-api-key': this.apiKey,
    }
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt
    if (elapsed < MIN_REQUEST_GAP_MS) {
      await sleep(MIN_REQUEST_GAP_MS - elapsed)
    }
    this.lastRequestAt = Date.now()
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('setlist.fm API key not configured')
    }

    const url = new URL(`${SETLISTFM_BASE_URL}${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
      }
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      await this.throttle()
      const response = await fetch(url.toString(), { headers: this.getHeaders() })

      if (response.status === 404) {
        throw new NotFoundError(`setlist.fm 404: ${path}`)
      }

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After')
        const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN
        const waitMs = Number.isFinite(retryAfterSec)
          ? Math.max(1000, retryAfterSec * 1000)
          : Math.min(30_000, 1500 * 2 ** attempt)
        console.log(
          `  setlist.fm rate limited (429); waiting ${Math.round(waitMs / 1000)}s…`
        )
        await sleep(waitMs)
        lastError = new Error('setlist.fm API error (429): Too Many Requests')
        continue
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(
          `setlist.fm API error (${response.status}): ${text || response.statusText}`
        )
      }

      return (await response.json()) as T
    }

    throw lastError || new Error('setlist.fm API error (429): Too Many Requests')
  }

  async searchArtists(name: string): Promise<SetlistFMArtist[]> {
    try {
      const data = await this.request<SetlistFMArtistSearchResult>('/search/artists', {
        artistName: name,
        sort: 'relevance',
      })
      return data.artist || []
    } catch (error) {
      if (error instanceof NotFoundError) return []
      throw error
    }
  }

  async getArtistSetlists(
    mbid: string,
    page: number = 1
  ): Promise<SetlistFMSetlistSearchResult> {
    return this.request<SetlistFMSetlistSearchResult>(`/artist/${mbid}/setlists`, {
      p: String(page),
    })
  }

  /**
   * Resolve artist by name, then fetch recent setlists (first page).
   */
  async searchSetlistsByName(
    artistName: string
  ): Promise<{ setlists: SetlistFMSetlist[]; mbid: string | null; artistName: string | null }> {
    const artists = await this.searchArtists(artistName)
    const firstArtist = artists[0]
    if (!firstArtist) {
      return { setlists: [], mbid: null, artistName: null }
    }

    try {
      const result = await this.getArtistSetlists(firstArtist.mbid, 1)
      return {
        setlists: result.setlist || [],
        mbid: firstArtist.mbid,
        artistName: firstArtist.name,
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { setlists: [], mbid: firstArtist.mbid, artistName: firstArtist.name }
      }
      throw error
    }
  }

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

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
