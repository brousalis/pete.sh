/**
 * Types for multi-account Google Calendar integration
 */

export interface CalendarAccountSelectedCalendar {
  calendarId: string
  name: string
  color?: string
  visible: boolean
  primary?: boolean
}

export interface CalendarAccountRow {
  id: string
  email: string
  display_name: string | null
  access_token: string
  refresh_token: string | null
  expiry_date: number | null
  is_active: boolean
  needs_reauth: boolean
  selected_calendars: CalendarAccountSelectedCalendar[]
  connected_at: string
  updated_at: string
}

/** Safe version of CalendarAccountRow without sensitive token fields */
export interface CalendarAccountPublic {
  id: string
  email: string
  display_name: string | null
  is_active: boolean
  needs_reauth: boolean
  selected_calendars: CalendarAccountSelectedCalendar[]
  connected_at: string
  updated_at: string
}

export interface CalendarAccountInsert {
  email: string
  display_name?: string | null
  access_token: string
  refresh_token?: string | null
  expiry_date?: number | null
  is_active?: boolean
  needs_reauth?: boolean
  selected_calendars?: CalendarAccountSelectedCalendar[]
}

export interface CalendarAccountUpdate {
  display_name?: string | null
  access_token?: string
  refresh_token?: string | null
  expiry_date?: number | null
  is_active?: boolean
  needs_reauth?: boolean
  selected_calendars?: CalendarAccountSelectedCalendar[]
}

export interface GoogleCalendarListEntry {
  id: string
  summary: string
  description?: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accessRole: string
  timeZone?: string
}
