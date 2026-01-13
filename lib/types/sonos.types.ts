/**
 * TypeScript types for Sonos integration
 */

export interface SonosPlayer {
  uuid: string
  name: string
  coordinator: {
    uuid: string
    state: SonosState
  }
  state: SonosState
  roomName: string
  groupState: {
    volume: number
    mute: boolean
  }
}

export interface SonosState {
  volume: number
  mute: boolean
  equalizer: {
    bass: number
    treble: number
    loudness: boolean
    surroundEnabled: boolean
    nightMode: boolean
  }
  currentTrack: SonosTrack
  nextTrack?: SonosTrack
  playbackState: "PLAYING" | "PAUSED" | "STOPPED"
  playMode: {
    repeat: "none" | "one" | "all"
    shuffle: boolean
    crossfade: boolean
  }
  uri: string
  trackNo: number
  elapsedTime: number
  elapsedTimeFormatted: string
}

export interface SonosTrack {
  artist: string
  title: string
  album: string
  albumArtUri: string
  duration: number
  uri: string
  type: string
  stationName?: string
  absoluteAlbumArtUri?: string
}

export interface SonosZone {
  uuid: string
  coordinator: string
  members: string[]
}
