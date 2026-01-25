"use client"

import { Button } from "@/components/ui/button"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CalendarViewMode } from "@/lib/types/calendar-views.types"
import { cn } from "@/lib/utils"
import { getViewTitle, navigateDate } from "@/lib/utils/calendar-utils"
import { setMonth, setYear, startOfMonth } from "date-fns"
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  RefreshCw,
  Search,
} from "lucide-react"
import { useState } from "react"

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: CalendarViewMode
  searchQuery: string
  isLoading: boolean
  onDateChange: (date: Date, direction?: "left" | "right") => void
  onViewModeChange: (mode: CalendarViewMode) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
}

const VIEW_MODES: { value: CalendarViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "month", label: "Month", icon: <CalendarDays className="size-3.5" /> },
  { value: "week", label: "Week", icon: <Calendar className="size-3.5" /> },
  { value: "day", label: "Day", icon: <Clock className="size-3.5" /> },
  { value: "agenda", label: "Upcoming", icon: <List className="size-3.5" /> },
]

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function CalendarHeader({
  currentDate,
  viewMode,
  searchQuery,
  isLoading,
  onDateChange,
  onViewModeChange,
  onSearchChange,
  onRefresh,
}: CalendarHeaderProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const title = getViewTitle(currentDate, viewMode)

  const handlePrev = () => {
    const newDate = navigateDate(currentDate, "prev", viewMode)
    onDateChange(newDate, "left")
  }

  const handleNext = () => {
    const newDate = navigateDate(currentDate, "next", viewMode)
    onDateChange(newDate, "right")
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const handleMonthChange = (month: string) => {
    const monthIndex = MONTHS.indexOf(month)
    if (monthIndex !== -1) {
      const newDate = setMonth(currentDate, monthIndex)
      onDateChange(newDate)
    }
  }

  const handleYearChange = (year: string) => {
    const newDate = setYear(currentDate, parseInt(year))
    onDateChange(newDate)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setDatePickerOpen(false)
    }
  }

  // Generate year options (current year -5 to +5)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  return (
    <div className="flex flex-col gap-2 border-b border-border/50 bg-card/50 px-3 py-2">
      {/* Top row - Navigation and title */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5">
          {/* Today button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 text-xs"
          >
            Today
          </Button>

          {/* Prev/Next navigation */}
          <div className="flex items-center rounded-md border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8 rounded-r-none"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 rounded-l-none"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Date picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 gap-1.5 text-base font-semibold"
              >
                <span>{title}</span>
                <Calendar className="size-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex items-center gap-2 border-b border-border/50 p-3">
                <Select
                  value={MONTHS[currentDate.getMonth()]}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={currentDate.getFullYear().toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="h-8 w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CalendarPicker
                mode="single"
                selected={currentDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Right side - View toggle and actions */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[140px] pl-7 text-xs lg:w-[180px]"
            />
          </div>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Bottom row - View mode switcher */}
      <div className="flex items-center justify-between">
        {/* View mode tabs */}
        <div className="flex rounded-md border border-border/50 bg-muted/30 p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all",
                viewMode === mode.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode.icon}
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Quick date shortcuts */}
        <div className="hidden items-center gap-1 text-[11px] text-muted-foreground md:flex">
          <span>Jump to:</span>
          <button
            onClick={() => onDateChange(startOfMonth(new Date()))}
            className="rounded px-1.5 py-0.5 hover:bg-muted"
          >
            This month
          </button>
          <span>·</span>
          <button
            onClick={() => onDateChange(startOfMonth(setMonth(new Date(), new Date().getMonth() + 1)))}
            className="rounded px-1.5 py-0.5 hover:bg-muted"
          >
            Next month
          </button>
        </div>
      </div>
    </div>
  )
}
