"use client"

import { Button } from "@/components/ui/button"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { DateNavigator } from "@/components/ui/date-navigator"
import { Input } from "@/components/ui/input"
import { PageHeader, PageHeaderRow } from "@/components/ui/page-header"
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
import { ViewToggle } from "@/components/ui/view-toggle"
import type { CalendarViewMode } from "@/lib/types/calendar-views.types"
import { cn } from "@/lib/utils"
import { getViewTitle, navigateDate } from "@/lib/utils/calendar-utils"
import { isSameDay, isSameMonth, isSameWeek, setMonth, setYear, startOfMonth } from "date-fns"
import {
  Calendar,
  CalendarDays,
  Clock,
  Dumbbell,
  List,
  RefreshCw,
  Search,
} from "lucide-react"
import { useMemo, useState } from "react"

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: CalendarViewMode
  searchQuery: string
  isLoading: boolean
  mobileInfoActive?: boolean
  onDateChange: (date: Date, direction?: "left" | "right") => void
  onViewModeChange: (mode: CalendarViewMode) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
  onToggleMobileInfo?: () => void
}

const VIEW_MODE_OPTIONS: { value: CalendarViewMode; label: string; icon: React.ReactNode }[] = [
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
  mobileInfoActive = false,
  onDateChange,
  onViewModeChange,
  onSearchChange,
  onRefresh,
  onToggleMobileInfo,
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

  const isAtToday = useMemo(() => {
    const now = new Date()
    switch (viewMode) {
      case "month": return isSameMonth(currentDate, now)
      case "week": return isSameWeek(currentDate, now, { weekStartsOn: 0 })
      case "day":
      case "agenda": return isSameDay(currentDate, now)
      default: return false
    }
  }, [currentDate, viewMode])

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

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)



  return (
    <PageHeader>
      <PageHeaderRow>
      {/* Left side - Navigation */}
      <div className="flex items-center gap-1.5">
        <DateNavigator
          label={title}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onLabelClick={() => setDatePickerOpen(true)}
          isAtToday={isAtToday}
        />

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
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
              <div className="flex items-center gap-1">
        <ViewToggle
          options={VIEW_MODE_OPTIONS}
          value={viewMode}
          onChange={onViewModeChange}
          hideLabelsOnMobile
        />
        {onToggleMobileInfo && (
          <button
            onClick={onToggleMobileInfo}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all md:hidden",
              mobileInfoActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Dumbbell className="size-3.5" />
            <span className="hidden sm:inline">Info</span>
          </button>
        )}
      </div>

      </div>

      {/* Right side - Search and actions */}
      <div className="flex items-center gap-1">

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
        <div className="relative hidden sm:block">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-[140px] pl-7 text-xs lg:w-[180px]"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:hidden"
            >
              <Search className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 pl-7 text-xs"
                autoFocus
              />
            </div>
          </PopoverContent>
        </Popover>

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
      </PageHeaderRow>
    </PageHeader>
  )
}
