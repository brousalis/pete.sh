import {
  Calendar,
  Dumbbell,
  Flame,
  Sun,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface FocusConfig {
  icon: LucideIcon
  color: string
  bg: string
  bgStrong: string
  border: string
  gradient: string
}

export const FOCUS_CONFIG: Record<string, FocusConfig> = {
  Strength: {
    icon: Dumbbell,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    bgStrong: 'bg-orange-500/15',
    border: 'border-orange-500',
    gradient: 'from-orange-500/8 via-orange-500/4 to-transparent',
  },
  'Core/Posture': {
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    bgStrong: 'bg-blue-500/15',
    border: 'border-blue-500',
    gradient: 'from-blue-500/8 via-blue-500/4 to-transparent',
  },
  Hybrid: {
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    bgStrong: 'bg-purple-500/15',
    border: 'border-purple-500',
    gradient: 'from-purple-500/8 via-purple-500/4 to-transparent',
  },
  Endurance: {
    icon: Flame,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    bgStrong: 'bg-red-500/15',
    border: 'border-red-500',
    gradient: 'from-red-500/8 via-red-500/4 to-transparent',
  },
  Circuit: {
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    bgStrong: 'bg-green-500/15',
    border: 'border-green-500',
    gradient: 'from-green-500/8 via-green-500/4 to-transparent',
  },
  HIIT: {
    icon: Flame,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    bgStrong: 'bg-amber-500/15',
    border: 'border-amber-500',
    gradient: 'from-amber-500/8 via-amber-500/4 to-transparent',
  },
  Rest: {
    icon: Calendar,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    bgStrong: 'bg-slate-500/15',
    border: 'border-slate-500',
    gradient: 'from-slate-500/8 via-slate-500/4 to-transparent',
  },
  'Active Recovery': {
    icon: Sun,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    bgStrong: 'bg-teal-500/15',
    border: 'border-teal-500',
    gradient: 'from-teal-500/8 via-teal-500/4 to-transparent',
  },
}

export const DEFAULT_FOCUS_CONFIG = FOCUS_CONFIG.Rest!

export function getFocusConfig(focus: string | undefined): FocusConfig {
  if (!focus) return DEFAULT_FOCUS_CONFIG
  return FOCUS_CONFIG[focus] ?? DEFAULT_FOCUS_CONFIG
}

export function getTempColor(tempF: number): string {
  if (tempF <= 20) return 'text-blue-400'
  if (tempF <= 32) return 'text-blue-300'
  if (tempF <= 45) return 'text-sky-300'
  if (tempF <= 55) return 'text-slate-400'
  if (tempF <= 65) return 'text-slate-300'
  if (tempF <= 75) return 'text-amber-400'
  if (tempF <= 85) return 'text-orange-400'
  return 'text-red-400'
}
