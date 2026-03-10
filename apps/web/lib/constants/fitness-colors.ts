import {
  Calendar,
  Dumbbell,
  Flame,
  Sun,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { FOCUS_ACCENT, TW, type AccentName } from './colors'
export { getTempColor } from './colors'

export interface FocusConfig {
  icon: LucideIcon
  color: string
  bg: string
  bgStrong: string
  border: string
  gradient: string
}

const FOCUS_ICONS: Record<string, LucideIcon> = {
  Strength: Dumbbell,
  'Core/Posture': Target,
  Core: Target,
  Hybrid: Zap,
  Endurance: Flame,
  Circuit: Zap,
  HIIT: Flame,
  Rest: Calendar,
  'Active Recovery': Sun,
}

function buildFocusConfig(focus: string, accent: AccentName): FocusConfig {
  const tw = TW[accent]
  return {
    icon: FOCUS_ICONS[focus] ?? Calendar,
    color: tw.text,
    bg: tw.bg10,
    bgStrong: tw.bg15,
    border: tw.border,
    gradient: `from-accent-${accent}/8 via-accent-${accent}/4 to-transparent`,
  }
}

export const FOCUS_CONFIG: Record<string, FocusConfig> = Object.fromEntries(
  Object.entries(FOCUS_ACCENT).map(([focus, accent]) => [focus, buildFocusConfig(focus, accent)])
)

export const DEFAULT_FOCUS_CONFIG = FOCUS_CONFIG.Rest!

export function getFocusConfig(focus: string | undefined): FocusConfig {
  if (!focus) return DEFAULT_FOCUS_CONFIG
  return FOCUS_CONFIG[focus] ?? DEFAULT_FOCUS_CONFIG
}
