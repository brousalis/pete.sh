/**
 * Minimal setlist.fm types for the playlist consensus script.
 */

export interface SetlistData {
  id: string
  eventDate: string
  artist: SetlistArtist
  venue: SetlistVenue
  tour?: SetlistTour
  sets: SetlistSet[]
  url: string
  lastUpdated: string
}

export interface SetlistArtist {
  mbid: string
  name: string
  sortName: string
  url: string
}

export interface SetlistVenue {
  id: string
  name: string
  city: {
    id: string
    name: string
    state?: string
    stateCode?: string
    country: {
      code: string
      name: string
    }
  }
  url: string
}

export interface SetlistTour {
  name: string
}

export interface SetlistSet {
  name?: string
  encore?: number
  song: SetlistSong[]
}

export interface SetlistSong {
  name: string
  info?: string
  cover?: {
    mbid: string
    name: string
    sortName: string
  }
  tape?: boolean
  with?: {
    mbid: string
    name: string
    sortName: string
  }
}

export interface SetlistFMSearchResult {
  type: string
  itemsPerPage: number
  page: number
  total: number
}

export interface SetlistFMArtistSearchResult extends SetlistFMSearchResult {
  artist: SetlistFMArtist[]
}

export interface SetlistFMSetlistSearchResult extends SetlistFMSearchResult {
  setlist: SetlistFMSetlist[]
}

export interface SetlistFMArtist {
  mbid: string
  name: string
  sortName: string
  disambiguation?: string
  url: string
}

export interface SetlistFMSetlist {
  id: string
  versionId: string
  eventDate: string
  lastUpdated: string
  artist: SetlistFMArtist
  venue: {
    id: string
    name: string
    city: {
      id: string
      name: string
      state?: string
      stateCode?: string
      coords?: {
        lat: number
        long: number
      }
      country: {
        code: string
        name: string
      }
    }
    url: string
  }
  tour?: { name: string }
  sets: {
    set: Array<{
      name?: string
      encore?: number
      song: Array<{
        name: string
        info?: string
        cover?: SetlistFMArtist
        tape?: boolean
        with?: SetlistFMArtist
      }>
    }>
  }
  url: string
}
