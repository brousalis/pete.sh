"use client"

import { cn } from "@/lib/utils"
import {
  isAllDayEvent,
  formatEventTime,
  getEventStartDate,
  getEventEndDate,
  getEventDuration,
} from "@/lib/utils/calendar-utils"
import { getEventColor } from "@/lib/types/calendar-views.types"
import type { CalendarEvent } from "@/lib/types/calendar.types"
import { format, differenceInDays } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Bell,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

interface CalendarEventDetailProps {
  event: CalendarEvent | null
  onClose: () => void
  onNavigateToDate?: (date: Date) => void
}

export function CalendarEventDetail({
  event,
  onClose,
  onNavigateToDate,
}: CalendarEventDetailProps) {
  const [copied, setCopied] = useState(false)

  if (!event) return null

  const colors = getEventColor(event.colorId)
  const allDay = isAllDayEvent(event)
  const startDate = getEventStartDate(event)
  const endDate = getEventEndDate(event)
  const duration = getEventDuration(event)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getDurationDisplay = () => {
    if (allDay) {
      if (startDate && endDate) {
        const days = differenceInDays(endDate, startDate)
        if (days <= 1) return "All day"
        return `${days} days`
      }
      return "All day"
    }

    const hours = Math.floor(duration / 60)
    const minutes = duration % 60

    if (hours === 0) return `${minutes} min`
    if (minutes === 0) return `${hours} hr`
    return `${hours} hr ${minutes} min`
  }

  const getStatusBadge = () => {
    switch (event.status) {
      case "confirmed":
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-300">
            Confirmed
          </Badge>
        )
      case "tentative":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
            Tentative
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive">Cancelled</Badge>
        )
      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg",
          "lg:w-[360px]"
        )}
      >
        {/* Header */}
        <div className={cn("shrink-0 border-b border-border/50 p-4", colors.bg)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge()}
                {allDay && (
                  <Badge variant="outline" className="text-xs">
                    <CalendarDays className="mr-1 size-3" />
                    All day
                  </Badge>
                )}
              </div>
              <h2 className={cn("mt-2 text-xl font-bold leading-tight", colors.text)}>
                {event.summary}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Date & Time */}
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  {allDay ? (
                    <CalendarDays className="size-5 text-brand" />
                  ) : (
                    <Calendar className="size-5 text-brand" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {startDate && format(startDate, "EEEE, MMMM d, yyyy")}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {formatEventTime(event)}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Duration: {getDurationDisplay()}
                    </span>
                  </div>
                  {startDate && onNavigateToDate && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onNavigateToDate(startDate)}
                      className="mt-2 h-auto p-0 text-brand"
                    >
                      Go to this day
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <MapPin className="size-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">Location</div>
                    <p className="mt-0.5 text-sm text-muted-foreground break-words">
                      {event.location}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(event.location || "")}
                        className="h-7 text-xs"
                      >
                        {copied ? (
                          <Check className="mr-1 size-3" />
                        ) : (
                          <Copy className="mr-1 size-3" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 text-xs"
                      >
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 size-3" />
                          Open Maps
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="rounded-xl bg-muted/50 p-4">
                <h3 className="mb-2 font-semibold">Description</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.description}
                </p>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <h3 className="font-semibold">
                    Attendees ({event.attendees.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {event.attendees.map((attendee, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {attendee.displayName || attendee.email}
                        </div>
                        {attendee.displayName && (
                          <div className="truncate text-xs text-muted-foreground">
                            {attendee.email}
                          </div>
                        )}
                      </div>
                      <AttendeeStatus status={attendee.responseStatus} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders */}
            {event.reminders && !event.reminders.useDefault && event.reminders.overrides && (
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="size-4 text-muted-foreground" />
                  <h3 className="font-semibold">Reminders</h3>
                </div>
                <div className="space-y-1">
                  {event.reminders.overrides.map((reminder, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground"
                    >
                      {formatReminderTime(reminder.minutes)} ({reminder.method})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Meta info */}
            <div className="text-xs text-muted-foreground">
              <div>Created: {format(new Date(event.created), "MMM d, yyyy 'at' h:mm a")}</div>
              <div>Updated: {format(new Date(event.updated), "MMM d, yyyy 'at' h:mm a")}</div>
            </div>

            {/* Open in Google Calendar */}
            {event.htmlLink && (
              <Button variant="outline" className="w-full" asChild>
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 size-4" />
                  Open in Google Calendar
                </a>
              </Button>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  )
}

function AttendeeStatus({
  status,
}: {
  status: "needsAction" | "declined" | "tentative" | "accepted"
}) {
  const config = {
    needsAction: {
      label: "Pending",
      className: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    },
    declined: {
      label: "Declined",
      className: "bg-red-500/20 text-red-600 dark:text-red-400",
    },
    tentative: {
      label: "Maybe",
      className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    },
    accepted: {
      label: "Going",
      className: "bg-green-500/20 text-green-600 dark:text-green-400",
    },
  }

  const { label, className } = config[status]

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", className)}>
      {label}
    </span>
  )
}

function formatReminderTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes before`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours} hour${hours > 1 ? "s" : ""} before`
  }
  const days = Math.floor(minutes / 1440)
  return `${days} day${days > 1 ? "s" : ""} before`
}
