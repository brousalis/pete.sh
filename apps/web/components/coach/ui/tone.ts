/**
 * Single source of truth for what a colour means in petehome.
 *
 * Sport hue is fixed per discipline and identical everywhere the discipline
 * appears — plan chip, session icon, chart series. Status tone is reserved for
 * safety and progress readouts; it never decorates.
 */

export type Tone = 'good' | 'info' | 'caution' | 'alert' | 'neutral' | 'brand'

export type Sport = 'swim' | 'bike' | 'run' | 'strength' | 'brick' | 'rest'

interface ToneClasses {
  text: string
  bg: string
  border: string
  dot: string
  stroke: string
}

const TONES: Record<Tone, ToneClasses> = {
  good: {
    text: 'text-tone-good',
    bg: 'wash-good',
    border: 'border-tone-good/35',
    dot: 'bg-tone-good',
    stroke: 'stroke-tone-good',
  },
  info: {
    text: 'text-tone-info',
    bg: 'wash-info',
    border: 'border-tone-info/35',
    dot: 'bg-tone-info',
    stroke: 'stroke-tone-info',
  },
  caution: {
    text: 'text-tone-caution',
    bg: 'wash-caution',
    border: 'border-tone-caution/35',
    dot: 'bg-tone-caution',
    stroke: 'stroke-tone-caution',
  },
  alert: {
    text: 'text-tone-alert',
    bg: 'wash-alert',
    border: 'border-tone-alert/40',
    dot: 'bg-tone-alert',
    stroke: 'stroke-tone-alert',
  },
  neutral: {
    text: 'text-ink-2',
    bg: 'bg-surface-2',
    border: 'border-line',
    dot: 'bg-ink-3',
    stroke: 'stroke-ink-3',
  },
  brand: {
    text: 'text-brand',
    bg: 'wash-brand',
    border: 'border-brand/35',
    dot: 'bg-brand',
    stroke: 'stroke-brand',
  },
}

export function toneClasses(tone: Tone): ToneClasses {
  return TONES[tone]
}

const SPORTS: Record<Sport, { text: string; dot: string; bar: string; soft: string }> = {
  swim: {
    text: 'text-sport-swim',
    dot: 'bg-sport-swim',
    bar: 'bg-sport-swim',
    soft: 'bg-sport-swim/15',
  },
  bike: {
    text: 'text-sport-bike',
    dot: 'bg-sport-bike',
    bar: 'bg-sport-bike',
    soft: 'bg-sport-bike/15',
  },
  run: {
    text: 'text-sport-run',
    dot: 'bg-sport-run',
    bar: 'bg-sport-run',
    soft: 'bg-sport-run/15',
  },
  strength: {
    text: 'text-sport-strength',
    dot: 'bg-sport-strength',
    bar: 'bg-sport-strength',
    soft: 'bg-sport-strength/15',
  },
  brick: {
    text: 'text-sport-run',
    dot: 'bg-sport-run',
    bar: 'bg-sport-run',
    soft: 'bg-sport-run/15',
  },
  rest: {
    text: 'text-sport-rest',
    dot: 'bg-sport-rest',
    bar: 'bg-sport-rest',
    soft: 'bg-surface-2',
  },
}

export function sportClasses(sport: string) {
  return SPORTS[sport as Sport] ?? SPORTS.rest
}

/** ACWR outside 0.8–1.3 means the ramp is unsafe, not merely notable. */
export function acwrTone(acwr: number | null | undefined): Tone {
  if (acwr == null) return 'neutral'
  if (acwr > 1.5 || acwr < 0.7) return 'alert'
  if (acwr > 1.3 || acwr < 0.8) return 'caution'
  return 'good'
}

/** Negative form is expected in a build block; deeply negative is not. */
export function tsbTone(tsb: number | null | undefined): Tone {
  if (tsb == null) return 'neutral'
  if (tsb < -30) return 'alert'
  if (tsb < -15) return 'caution'
  return 'good'
}

export function painTone(pain: number | null | undefined): Tone {
  if (pain == null) return 'neutral'
  if (pain >= 4) return 'alert'
  if (pain >= 2) return 'caution'
  return 'good'
}
