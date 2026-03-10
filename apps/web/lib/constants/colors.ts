/**
 * Centralized color constants for the petehome palette.
 *
 * All accent colors are defined as CSS custom properties in globals.css.
 * This file provides:
 *   - HEX values for Recharts / SVG (stroke, fill, stopColor)
 *   - Tailwind class maps for each accent name
 *   - Domain-specific color maps (workout types, fitness focus, HR zones, etc.)
 */

// ---------------------------------------------------------------------------
// Hex values – use for Recharts stroke/fill, SVG gradients, inline styles
// Approximate hex conversions from the oklch values in globals.css
// ---------------------------------------------------------------------------

export const HEX = {
  ember: '#c97a3a',
  azure: '#5b8fd9',
  violet: '#9b5de5',
  rose: '#d96b6b',
  sage: '#4dba8a',
  gold: '#d4a843',
  teal: '#5ba8a0',
  slate: '#7c829a',
} as const

export type AccentName = keyof typeof HEX

// ---------------------------------------------------------------------------
// Tailwind class sets – use when you need text / bg / border / ring classes
// ---------------------------------------------------------------------------

export interface TwColorSet {
  text: string
  bg: string
  bg10: string
  bg15: string
  border: string
  ring: string
}

export const TW: Record<AccentName, TwColorSet> = {
  ember: {
    text: 'text-accent-ember',
    bg: 'bg-accent-ember',
    bg10: 'bg-accent-ember/10',
    bg15: 'bg-accent-ember/15',
    border: 'border-accent-ember',
    ring: 'ring-accent-ember',
  },
  azure: {
    text: 'text-accent-azure',
    bg: 'bg-accent-azure',
    bg10: 'bg-accent-azure/10',
    bg15: 'bg-accent-azure/15',
    border: 'border-accent-azure',
    ring: 'ring-accent-azure',
  },
  violet: {
    text: 'text-accent-violet',
    bg: 'bg-accent-violet',
    bg10: 'bg-accent-violet/10',
    bg15: 'bg-accent-violet/15',
    border: 'border-accent-violet',
    ring: 'ring-accent-violet',
  },
  rose: {
    text: 'text-accent-rose',
    bg: 'bg-accent-rose',
    bg10: 'bg-accent-rose/10',
    bg15: 'bg-accent-rose/15',
    border: 'border-accent-rose',
    ring: 'ring-accent-rose',
  },
  sage: {
    text: 'text-accent-sage',
    bg: 'bg-accent-sage',
    bg10: 'bg-accent-sage/10',
    bg15: 'bg-accent-sage/15',
    border: 'border-accent-sage',
    ring: 'ring-accent-sage',
  },
  gold: {
    text: 'text-accent-gold',
    bg: 'bg-accent-gold',
    bg10: 'bg-accent-gold/10',
    bg15: 'bg-accent-gold/15',
    border: 'border-accent-gold',
    ring: 'ring-accent-gold',
  },
  teal: {
    text: 'text-accent-teal',
    bg: 'bg-accent-teal',
    bg10: 'bg-accent-teal/10',
    bg15: 'bg-accent-teal/15',
    border: 'border-accent-teal',
    ring: 'ring-accent-teal',
  },
  slate: {
    text: 'text-accent-slate',
    bg: 'bg-accent-slate',
    bg10: 'bg-accent-slate/10',
    bg15: 'bg-accent-slate/15',
    border: 'border-accent-slate',
    ring: 'ring-accent-slate',
  },
}

// ---------------------------------------------------------------------------
// Apple Watch ring colors (Apple canonical – do not change values)
// ---------------------------------------------------------------------------

export const APPLE_WATCH_RINGS = {
  move: '#FF2D55',
  exercise: '#92E82A',
  stand: '#00D4FF',
} as const

// ---------------------------------------------------------------------------
// CTA transit line colors (official CTA brand – do not change values)
// ---------------------------------------------------------------------------

export const CTA_LINE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  Brown: { bg: 'bg-[#62361B]', text: 'text-white', hex: '#62361B' },
  Purple: { bg: 'bg-[#522398]', text: 'text-white', hex: '#522398' },
  Red: { bg: 'bg-[#C60C30]', text: 'text-white', hex: '#C60C30' },
  Blue: { bg: 'bg-[#00A1DE]', text: 'text-white', hex: '#00A1DE' },
  Green: { bg: 'bg-[#009B3A]', text: 'text-white', hex: '#009B3A' },
  Orange: { bg: 'bg-[#F9461C]', text: 'text-white', hex: '#F9461C' },
  Pink: { bg: 'bg-[#E27EA6]', text: 'text-white', hex: '#E27EA6' },
  Yellow: { bg: 'bg-[#F9E300]', text: 'text-black', hex: '#F9E300' },
  bus: { bg: 'bg-[#565A5C]', text: 'text-white', hex: '#565A5C' },
}

// ---------------------------------------------------------------------------
// Workout type colors (HealthKit workout types -> accent mapping)
// ---------------------------------------------------------------------------

export const WORKOUT_TYPE_ACCENT: Record<string, AccentName> = {
  running: 'sage',
  walking: 'azure',
  hiking: 'sage',
  cycling: 'ember',
  functionalStrengthTraining: 'violet',
  traditionalStrengthTraining: 'violet',
  coreTraining: 'rose',
  hiit: 'rose',
  rowing: 'teal',
  stairClimbing: 'gold',
  elliptical: 'teal',
  other: 'slate',
}

export function getWorkoutAccent(type: string): AccentName {
  return WORKOUT_TYPE_ACCENT[type] ?? 'slate'
}

export function getWorkoutHex(type: string): string {
  return HEX[getWorkoutAccent(type)]
}

export function getWorkoutTw(type: string): TwColorSet {
  return TW[getWorkoutAccent(type)]
}

// ---------------------------------------------------------------------------
// Fitness focus colors (routine day types -> accent mapping)
// ---------------------------------------------------------------------------

export const FOCUS_ACCENT: Record<string, AccentName> = {
  Strength: 'ember',
  'Core/Posture': 'azure',
  Core: 'azure',
  Hybrid: 'violet',
  Endurance: 'rose',
  Circuit: 'sage',
  HIIT: 'gold',
  Rest: 'slate',
  'Active Recovery': 'teal',
}

export function getFocusAccent(focus: string | undefined): AccentName {
  if (!focus) return 'slate'
  return FOCUS_ACCENT[focus] ?? 'slate'
}

// ---------------------------------------------------------------------------
// HR zone colors
// ---------------------------------------------------------------------------

export const HR_ZONE_COLORS = {
  rest: { hex: HEX.slate, tw: TW.slate },
  warmup: { hex: HEX.sage, tw: TW.sage },
  fatBurn: { hex: HEX.gold, tw: TW.gold },
  cardio: { hex: HEX.ember, tw: TW.ember },
  peak: { hex: HEX.rose, tw: TW.rose },
} as const

export const HR_ZONE_HEX_ARRAY = [
  HEX.slate,
  HEX.sage,
  HEX.gold,
  HEX.ember,
  HEX.rose,
] as const

// ---------------------------------------------------------------------------
// Meal type colors
// ---------------------------------------------------------------------------

export const MEAL_TYPE_COLORS: Record<string, { border: string; bg: string }> = {
  breakfast: { border: 'border-accent-gold/30', bg: 'bg-accent-gold/5' },
  lunch: { border: 'border-accent-azure/30', bg: 'bg-accent-azure/5' },
  dinner: { border: 'border-accent-violet/30', bg: 'bg-accent-violet/5' },
  snack: { border: 'border-accent-sage/30', bg: 'bg-accent-sage/5' },
}

// ---------------------------------------------------------------------------
// Mood colors (Maple)
// ---------------------------------------------------------------------------

export const MOOD_COLORS = {
  happy: { bg: 'bg-accent-sage/10', text: 'text-accent-sage', border: 'border-accent-sage/30' },
  neutral: { bg: 'bg-accent-gold/10', text: 'text-accent-gold', border: 'border-accent-gold/30' },
  sad: { bg: 'bg-accent-ember/10', text: 'text-accent-ember', border: 'border-accent-ember/30' },
} as const

// ---------------------------------------------------------------------------
// AI coach readiness colors
// ---------------------------------------------------------------------------

export const READINESS_COLORS = {
  high: { text: 'text-accent-sage', bg: 'bg-accent-sage/10', hex: HEX.sage },
  moderate: { text: 'text-accent-gold', bg: 'bg-accent-gold/10', hex: HEX.gold },
  low: { text: 'text-accent-ember', bg: 'bg-accent-ember/10', hex: HEX.ember },
  critical: { text: 'text-accent-rose', bg: 'bg-accent-rose/10', hex: HEX.rose },
} as const

// ---------------------------------------------------------------------------
// Calendar event colors (Google Calendar colorId 1-11 + custom)
// ---------------------------------------------------------------------------

export const CALENDAR_EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '1': { bg: 'bg-chart-2/30', text: 'text-accent-azure', border: 'border-accent-azure' },
  '2': { bg: 'bg-chart-3/30', text: 'text-accent-sage', border: 'border-accent-sage' },
  '3': { bg: 'bg-chart-4/30', text: 'text-accent-violet', border: 'border-accent-violet' },
  '4': { bg: 'bg-chart-7/30', text: 'text-accent-rose', border: 'border-accent-rose' },
  '5': { bg: 'bg-chart-5/30', text: 'text-accent-gold', border: 'border-accent-gold' },
  '6': { bg: 'bg-chart-1/30', text: 'text-accent-ember', border: 'border-accent-ember' },
  '7': { bg: 'bg-chart-6/30', text: 'text-accent-teal', border: 'border-accent-teal' },
  '8': { bg: 'bg-chart-8/30', text: 'text-accent-slate', border: 'border-accent-slate' },
  '9': { bg: 'bg-chart-4/30', text: 'text-accent-violet', border: 'border-accent-violet' },
  '10': { bg: 'bg-chart-3/30', text: 'text-accent-sage', border: 'border-accent-sage' },
  '11': { bg: 'bg-chart-7/30', text: 'text-accent-rose', border: 'border-accent-rose' },
  fitness: { bg: 'bg-accent-ember/30', text: 'text-accent-ember', border: 'border-accent-ember' },
  'fitness-complete': { bg: 'bg-accent-sage/30', text: 'text-accent-sage', border: 'border-accent-sage' },
  'meal-plan': { bg: 'bg-accent-teal/25', text: 'text-accent-teal', border: 'border-accent-teal' },
  'meal-plan-skipped': { bg: 'bg-accent-slate/20', text: 'text-accent-slate', border: 'border-accent-slate' },
  default: { bg: 'bg-brand/30', text: 'text-brand', border: 'border-brand' },
}

const DEFAULT_EVENT_COLOR = CALENDAR_EVENT_COLORS.default!

export function getEventColor(colorId?: string): { bg: string; text: string; border: string } {
  if (!colorId) return DEFAULT_EVENT_COLOR
  return CALENDAR_EVENT_COLORS[colorId] ?? DEFAULT_EVENT_COLOR
}

// ---------------------------------------------------------------------------
// Temperature color helper
// ---------------------------------------------------------------------------

export function getTempColor(tempF: number): string {
  if (tempF <= 20) return 'text-accent-azure'
  if (tempF <= 32) return 'text-accent-azure'
  if (tempF <= 45) return 'text-accent-teal'
  if (tempF <= 55) return 'text-accent-slate'
  if (tempF <= 65) return 'text-accent-slate'
  if (tempF <= 75) return 'text-accent-gold'
  if (tempF <= 85) return 'text-accent-ember'
  return 'text-accent-rose'
}

// ---------------------------------------------------------------------------
// Coffee roast colors
// ---------------------------------------------------------------------------

export const ROAST_COLORS: Record<string, string> = {
  light: 'bg-accent-gold/15 text-accent-gold',
  medium: 'bg-accent-ember/15 text-accent-ember',
  dark: 'bg-accent-slate/15 text-accent-slate',
}

// ---------------------------------------------------------------------------
// Hue analytics chart colors
// ---------------------------------------------------------------------------

export const HUE_CHART_COLORS = {
  lightsOn: HEX.gold,
  brightness: HEX.violet,
  roomBar: HEX.gold,
} as const
