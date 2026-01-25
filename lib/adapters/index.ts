/**
 * Adapters Index
 * Export all adapters for easy importing
 */

// Base adapter
export { BaseAdapter, parseJsonSafe, getCurrentTimestamp } from './base.adapter'
export type { AdapterConfig, SyncResult } from './base.adapter'

// Hue adapter
export { HueAdapter, getHueAdapter } from './hue.adapter'
export type { HueFullState, HueCachedState } from './hue.adapter'

// Spotify adapter
export { SpotifyAdapter, getSpotifyAdapter } from './spotify.adapter'
export type { SpotifyFullState, SpotifyCachedState } from './spotify.adapter'

// Sonos adapter
export { SonosAdapter, getSonosAdapter } from './sonos.adapter'
export type { SonosFullState, SonosCachedState } from './sonos.adapter'

// Fitness adapter
export { FitnessAdapter, getFitnessAdapter } from './fitness.adapter'

// CTA adapter
export { CTAAdapter, getCTAAdapter } from './cta.adapter'
export type { CTAFullState, CTACachedState } from './cta.adapter'

// Calendar adapter
export { CalendarAdapter, getCalendarAdapter } from './calendar.adapter'
export type { CalendarFullState, CalendarCachedState } from './calendar.adapter'
