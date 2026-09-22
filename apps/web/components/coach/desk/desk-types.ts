export const DESK_PANELS = ['today', 'plan', 'load', 'activity', 'more', 'coach', 'fuel'] as const

export type DeskPanel = (typeof DESK_PANELS)[number]

export const PANEL_LABELS: Record<DeskPanel, string> = {
  today: 'Today',
  plan: 'Plan',
  load: 'Load',
  activity: 'Activity',
  more: 'More',
  coach: 'Coach',
  fuel: 'Fuel',
}

/** Tab order, shared by the desktop rail and the mobile tab bar. */
export const PANEL_ORDER: DeskPanel[] = [
  'today',
  'plan',
  'fuel',
  'activity',
  'load',
  'coach',
  'more',
]

/** Map chat tool names → desk panels. */
export const TOOL_PANEL: Record<string, DeskPanel> = {
  get_plan: 'plan',
  propose_plan_change: 'plan',
  get_injury_status: 'more',
  log_symptom: 'more',
  get_pt_protocol: 'more',
  get_training_load: 'load',
  get_readiness: 'today',
  project_race: 'load',
  query_activities: 'activity',
  get_activity_detail: 'activity',
  get_gear: 'more',
  get_nutrition_targets: 'fuel',
  get_weather: 'today',
  get_lake_conditions: 'today',
  get_daily_metrics: 'more',
}

export function parseDeskPanel(value: string | null | undefined): DeskPanel {
  if (value === 'chat') return 'coach'
  // Knee moved under More — keep old deep links working.
  if (value === 'knee') return 'more'
  if (value === 'fuelling' || value === 'nutrition') return 'fuel'
  if (value && (DESK_PANELS as readonly string[]).includes(value)) {
    return value as DeskPanel
  }
  return 'today'
}

export function toolNameToPanel(toolName: string): DeskPanel | null {
  return TOOL_PANEL[toolName] ?? null
}
