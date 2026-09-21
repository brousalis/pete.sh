export const DESK_PANELS = ['today', 'plan', 'knee', 'load', 'more', 'coach'] as const

export type DeskPanel = (typeof DESK_PANELS)[number]

export const PANEL_LABELS: Record<DeskPanel, string> = {
  today: 'Today',
  plan: 'Plan',
  knee: 'Knee',
  load: 'Load',
  more: 'More',
  coach: 'Coach',
}

/** Tab order, shared by the desktop rail and the mobile tab bar. */
export const PANEL_ORDER: DeskPanel[] = ['today', 'plan', 'knee', 'load', 'coach', 'more']

/** Map chat tool names → desk panels. */
export const TOOL_PANEL: Record<string, DeskPanel> = {
  get_plan: 'plan',
  propose_plan_change: 'plan',
  get_injury_status: 'knee',
  log_symptom: 'knee',
  get_pt_protocol: 'knee',
  get_training_load: 'load',
  get_readiness: 'today',
  project_race: 'load',
  get_gear: 'more',
  get_nutrition_targets: 'more',
  get_weather: 'today',
  get_lake_conditions: 'today',
  get_daily_metrics: 'knee',
}

export function parseDeskPanel(value: string | null | undefined): DeskPanel {
  if (value === 'chat') return 'coach'
  if (value && (DESK_PANELS as readonly string[]).includes(value)) {
    return value as DeskPanel
  }
  return 'today'
}

export function toolNameToPanel(toolName: string): DeskPanel | null {
  return TOOL_PANEL[toolName] ?? null
}
