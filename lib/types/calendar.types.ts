/**
 * TypeScript types for Google Calendar integration
 */

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  recurrence?: string[]
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: "needsAction" | "declined" | "tentative" | "accepted"
  }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: string
      minutes: number
    }>
  }
  colorId?: string
  status: "confirmed" | "tentative" | "cancelled"
  htmlLink?: string
  created: string
  updated: string
}

export interface CalendarListResponse {
  items: Array<{
    id: string
    summary: string
    description?: string
    timeZone?: string
    primary?: boolean
  }>
}

export interface CalendarEventsResponse {
  items: CalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}
