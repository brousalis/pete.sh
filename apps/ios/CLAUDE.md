# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**petehome** is the personal training + HealthKit sync app. One brand across watch, phone, and
widgets. The project has three targets:

- **Watch** (watchOS 10+) — read-only coach Today companion (`watch/`). No SwiftData, no live workouts.
- **iOS** (iPhone) — hybrid coach companion (`ios/`): native Today + HealthKit sync + Coach WebView + WorkoutKit scheduling
- **WidgetsExtension** — watch face complications (`widgets/`)

| Target | Bundle ID |
|--------|-----------|
| Watch | `com.petehome.watch` |
| iOS | `com.petehome.ios` |
| Widgets | `com.petehome.watch.widgets` |
| App Group | `group.com.petehome.app` |

Display name on device: **petehome**.

**Division of labour:** Apple Fitness / the system Workout app records sessions. The watch shows the
day plan. The iPhone syncs HealthKit and schedules WorkoutKit workouts from `/api/coach/watch/workouts`.

## Build & Run

```bash
# Open in Xcode
open petehome.xcodeproj

# Build and run on watchOS simulator: ⌘R
# Clean build folder: ⇧⌘K (required after adding new Swift files)
xcrun simctl uninstall booted com.petehome.watch
xcrun simctl uninstall booted com.petehome.ios
```

No external dependencies (CocoaPods, SPM). Pure SwiftUI + HealthKit (iOS) + WidgetKit.

## Architecture

### Watch (`watch/`)

- `CoachTodayStore` — `@Observable` singleton; loads App Group cache then `GET /api/coach/watch/today`
- `PetehomeAPI` — coach today + connection test only (no apple-health sync from the wrist)
- `CoachTodayView` / `CoachSettingsView` — two-page TabView
- Writes `SharedCoachTodayData` for complications after each successful refresh

### iOS (`ios/`)

- `HealthKitSyncManager` — phone → `/api/apple-health/*` ingest
- `CoachWorkoutScheduler` — schedules structured sessions into the Watch Workout app
- Coach WebView + native Today

### Widgets (`widgets/`)

- Complications read `SharedCoachTodayData` from the App Group (readiness / next session)

## Key Files

| File | Purpose |
|------|---------|
| `watch/Data/CoachTodayStore.swift` | Today load / cache / widget publish |
| `watch/Views/CoachTodayView.swift` | Day plan UI |
| `ios/Data/HealthKitSyncManager.swift` | Phone → `/api/apple-health/*` ingest (do not break) |
| `ios/Data/CoachWorkoutScheduler.swift` | WorkoutKit scheduling |
| `ios/Data/PetehomeAPI.swift` | Apple Health + coach API client |
| `ios/Views/TodayView.swift` | Native coach Today |
| `ios/Views/CoachWebViewTab.swift` | Coach desk WebView (`/coach`) |
| `widgets/PetehomeWidgets.swift` | Complication configuration |
| `widgets/SharedCoachTodayData.swift` | App Group snapshot (mirrored under `watch/Data/`) |

Full watch documentation: `watch/project.md`

## Critical Implementation Rules

### Font API — NEVER use `weight:` with TextStyle

```swift
// ✅ Correct
.font(.system(.caption2, design: .rounded))
.font(.system(size: 12, weight: .bold, design: .rounded))

// ❌ Won't compile
.font(.system(.caption2, weight: .bold, design: .rounded))
```

### ForEach — ALWAYS wrap ranges in Array

```swift
// ✅ Correct
ForEach(Array(1...7), id: \.self) { num in }

// ❌ Type inference issues
ForEach(1...7, id: \.self) { num in }
```

### Sheets — Handle child sheets inside child views

Don't present sheets from parent when a child sheet is already open (causes unexpected dismissal).

### Branding identifiers

- Display / UA / workout `source`: `petehome` / `petehome-ios`
- Widget kind: `petehomeComplication`
- Bundle IDs / App Group: see table above

### Watch product rules

- Watch is **read-only** — no session complete/skip (guardrails live on the server / PWA)
- Never call `/api/fitness/workout-definitions` from the watch
- Blocked sessions stay visible with reason; never hide them

## Design Guidelines

- **Colors**: Black background (#000000), green=ready/complete, orange=sport accent, red=blocked
- **Typography**: SF Pro Rounded (`.system(size:, design: .rounded)`), `.monospacedDigit()` for scores
- **Layout**: Test on 44mm and 49mm watch sizes

## Adding New Files

Most groups use Xcode's synchronized root folders (`watch/`, `ios/`, `widgets/`). New files under
those directories are picked up automatically. After adding files, clean build folder (⇧⌘K) if
needed.
