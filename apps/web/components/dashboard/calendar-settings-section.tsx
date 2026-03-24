'use client'

import { useCalendarConfig, useSettings } from '@/components/settings-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { apiGet } from '@/lib/api/client'
import type { CalendarAccountPublic } from '@/lib/types/calendar-account.types'
import type { CalendarConfig } from '@/lib/types/settings.types'
import type { CalendarViewMode } from '@/lib/types/calendar-views.types'
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UserCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface GoogleCalendarEntry {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
}

export function CalendarSettingsSection() {
  const { updateSettings } = useSettings()
  const calendarConfig = useCalendarConfig()
  const [accounts, setAccounts] = useState<CalendarAccountPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [accountCalendars, setAccountCalendars] = useState<Record<string, GoogleCalendarEntry[]>>({})
  const [loadingCalendars, setLoadingCalendars] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiGet<{ accounts: CalendarAccountPublic[] }>('/api/calendar/accounts')
      if (response.success && response.data) {
        setAccounts(response.data.accounts)
      }
    } catch {
      // Accounts not available (DB not set up yet, etc.)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Check for auth success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar_auth') === 'success') {
      toast.success('Google Calendar account connected')
      fetchAccounts()
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('calendar_auth')
      window.history.replaceState({}, '', url.toString())
    }
  }, [fetchAccounts])

  const handleConnect = () => {
    window.location.href = '/api/calendar/auth?returnTo=/settings'
  }

  const handleDisconnect = async (accountId: string) => {
    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to disconnect')
      toast.success('Account disconnected')
      setAccounts(prev => prev.filter(a => a.id !== accountId))
    } catch {
      toast.error('Failed to disconnect account')
    }
  }

  const handleReauth = (accountEmail: string) => {
    window.location.href = `/api/calendar/auth?returnTo=/settings&login_hint=${encodeURIComponent(accountEmail)}`
  }

  const handleToggleActive = async (accountId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!response.ok) throw new Error('Failed to update')
      setAccounts(prev =>
        prev.map(a => (a.id === accountId ? { ...a, is_active: isActive } : a))
      )
    } catch {
      toast.error('Failed to update account')
    }
  }

  const fetchCalendarsForAccount = async (accountId: string) => {
    if (accountCalendars[accountId]) return
    setLoadingCalendars(accountId)
    try {
      const response = await apiGet<{ calendars: GoogleCalendarEntry[] }>(
        `/api/calendar/accounts/${accountId}/calendars`
      )
      if (response.success && response.data) {
        setAccountCalendars(prev => ({ ...prev, [accountId]: response.data!.calendars }))
      }
    } catch {
      toast.error('Failed to load calendars')
    } finally {
      setLoadingCalendars(null)
    }
  }

  const handleToggleCalendar = async (
    accountId: string,
    calendarId: string,
    visible: boolean
  ) => {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    const updatedCalendars = account.selected_calendars.map(c =>
      c.calendarId === calendarId ? { ...c, visible } : c
    )

    // If the calendar isn't in selected_calendars yet, add it
    const exists = updatedCalendars.some(c => c.calendarId === calendarId)
    if (!exists) {
      const calEntry = accountCalendars[accountId]?.find(c => c.id === calendarId)
      updatedCalendars.push({
        calendarId,
        name: calEntry?.summary ?? calendarId,
        color: calEntry?.backgroundColor,
        visible,
        primary: calEntry?.primary,
      })
    }

    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_calendars: updatedCalendars }),
      })
      if (!response.ok) throw new Error('Failed to update')
      setAccounts(prev =>
        prev.map(a =>
          a.id === accountId ? { ...a, selected_calendars: updatedCalendars } : a
        )
      )
    } catch {
      toast.error('Failed to update calendar visibility')
    }
  }

  const handleExpandAccount = (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null)
    } else {
      setExpandedAccount(accountId)
      fetchCalendarsForAccount(accountId)
    }
  }

  const updateCalendarConfig = async (updates: Partial<CalendarConfig>) => {
    const newConfig = { ...calendarConfig, ...updates }
    await updateSettings({ calendar_config: newConfig })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground size-4" />
          <CardTitle className="text-base">Calendar</CardTitle>
        </div>
        <CardDescription>
          Manage Google Calendar accounts and display preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connected Accounts */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Connected Accounts</label>

          {loading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
              <span className="text-muted-foreground text-sm">Loading accounts...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-muted/50 rounded-lg border p-4 text-center">
              <p className="text-muted-foreground text-sm">
                No Google Calendar accounts connected
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map(account => (
                <Collapsible
                  key={account.id}
                  open={expandedAccount === account.id}
                  onOpenChange={() => handleExpandAccount(account.id)}
                >
                  <div className="bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3 p-3">
                      <UserCircle className="text-muted-foreground size-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {account.email}
                          </span>
                          {account.needs_reauth && (
                            <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium">
                              <AlertTriangle className="size-3" />
                              Re-auth needed
                            </span>
                          )}
                        </div>
                        {account.display_name && (
                          <p className="text-muted-foreground truncate text-xs">
                            {account.display_name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {account.needs_reauth ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReauth(account.email)
                            }}
                          >
                            <RefreshCw className="mr-1 size-3" />
                            Re-auth
                          </Button>
                        ) : (
                          <Switch
                            checked={account.is_active}
                            onCheckedChange={(checked) => handleToggleActive(account.id, checked)}
                            aria-label={`Toggle ${account.email} active`}
                          />
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive size-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will revoke access and remove{' '}
                                <strong>{account.email}</strong> from your calendar
                                integration. You can reconnect at any time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisconnect(account.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <ChevronDown
                              className={`size-4 transition-transform ${
                                expandedAccount === account.id ? 'rotate-180' : ''
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t px-3 pb-3 pt-2">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          Calendar visibility
                        </p>
                        {loadingCalendars === account.id ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="text-muted-foreground size-3 animate-spin" />
                            <span className="text-muted-foreground text-xs">
                              Loading calendars...
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {(accountCalendars[account.id] ?? []).map(cal => {
                              const selected = account.selected_calendars.find(
                                c => c.calendarId === cal.id
                              )
                              const isVisible = selected?.visible ?? true

                              return (
                                <label
                                  key={cal.id}
                                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={isVisible}
                                    onCheckedChange={(checked) =>
                                      handleToggleCalendar(
                                        account.id,
                                        cal.id,
                                        checked === true
                                      )
                                    }
                                  />
                                  {cal.backgroundColor && (
                                    <span
                                      className="size-2.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: cal.backgroundColor }}
                                    />
                                  )}
                                  <span className="truncate text-xs">
                                    {cal.summary}
                                    {cal.primary && (
                                      <span className="text-muted-foreground ml-1">
                                        (primary)
                                      </span>
                                    )}
                                  </span>
                                </label>
                              )
                            })}
                            {(accountCalendars[account.id] ?? []).length === 0 &&
                              loadingCalendars !== account.id && (
                                <p className="text-muted-foreground py-1 text-xs italic">
                                  No calendars found
                                </p>
                              )}
                          </div>
                        )}
                        <p className="text-muted-foreground mt-2 text-xs">
                          Connected{' '}
                          {new Date(account.connected_at).toLocaleDateString()}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleConnect}>
            <Plus className="mr-2 size-3" />
            Connect Google Account
            <ExternalLink className="ml-1 size-3 opacity-50" />
          </Button>
        </div>

        <div className="border-t" />

        {/* Display Preferences */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Display Preferences</label>

          {/* Default View */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Default view</label>
            <Select
              value={calendarConfig.default_view}
              onValueChange={(value) =>
                updateCalendarConfig({ default_view: value as CalendarViewMode })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="agenda">Agenda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week Starts On */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Week starts on</label>
            <Select
              value={String(calendarConfig.week_starts_on)}
              onValueChange={(value) =>
                updateCalendarConfig({ week_starts_on: Number(value) as 0 | 1 })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="cursor-pointer text-sm">
                  Show fitness events
                </label>
                <p className="text-muted-foreground text-xs">
                  Display workout routines on the calendar
                </p>
              </div>
              <Switch
                checked={calendarConfig.show_fitness_events}
                onCheckedChange={(checked) =>
                  updateCalendarConfig({ show_fitness_events: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="cursor-pointer text-sm">
                  Show meal plan events
                </label>
                <p className="text-muted-foreground text-xs">
                  Display meal plans on the calendar
                </p>
              </div>
              <Switch
                checked={calendarConfig.show_meal_plan_events}
                onCheckedChange={(checked) =>
                  updateCalendarConfig({ show_meal_plan_events: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="cursor-pointer text-sm">
                  Show declined events
                </label>
                <p className="text-muted-foreground text-xs">
                  Include events you have declined
                </p>
              </div>
              <Switch
                checked={calendarConfig.show_declined_events}
                onCheckedChange={(checked) =>
                  updateCalendarConfig({ show_declined_events: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="cursor-pointer text-sm">
                  Show weekends
                </label>
                <p className="text-muted-foreground text-xs">
                  Display Saturday and Sunday columns in week view
                </p>
              </div>
              <Switch
                checked={calendarConfig.show_weekends}
                onCheckedChange={(checked) =>
                  updateCalendarConfig({ show_weekends: checked })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
