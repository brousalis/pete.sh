import { CalendarView } from "@/components/dashboard/calendar-view"

export default function CalendarPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground">Your upcoming Google Calendar events</p>
      </div>
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <CalendarView />
      </div>
    </div>
  )
}
