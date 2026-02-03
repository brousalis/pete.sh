'use client'

import { ColorThemePicker } from '@/components/color-theme'
import { useSettings } from '@/components/settings-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Layout, Loader2, Palette, Settings } from 'lucide-react'

export function SettingsEditor() {
  const { settings, isLoading, error, updateSettings } = useSettings()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
          <Settings className="text-muted-foreground size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure your dashboard preferences
          </p>
        </div>
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Layout Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layout className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Layout</CardTitle>
          </div>
          <CardDescription>
            Customize the appearance of your dashboard layout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rounded Layout Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="rounded-layout"
                className="cursor-pointer text-sm font-medium"
              >
                Rounded layout
              </label>
              <p className="text-muted-foreground text-xs">
                Apply rounded corners to the main dashboard container
              </p>
            </div>
            <Switch
              id="rounded-layout"
              checked={settings?.rounded_layout ?? true}
              onCheckedChange={async checked => {
                await updateSettings({ rounded_layout: checked })
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <p className="text-muted-foreground mb-2 text-xs">
              Switch between light and dark mode
            </p>
            <ThemeToggle />
          </div>

          {/* Color Theme */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Accent color</label>
            <p className="text-muted-foreground mb-2 text-xs">
              Choose your preferred accent color
            </p>
            <ColorThemePicker />
          </div>
        </CardContent>
      </Card>

      {/* Future: Environment Config Section */}
      {/* This section will be for user-provided API keys, etc. */}
    </div>
  )
}
