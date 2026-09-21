# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**petehome** is the personal training + HealthKit sync app. One brand across watch, phone, and
widgets. The project has three targets:

- **Watch** (watchOS 10+) — standalone watch app (`watch/`), SwiftData local only
- **iOS** (iPhone) — companion app (`ios/`) with HealthKit sync into the local petehome server
- **WidgetsExtension** — watch face complications (`widgets/`)

| Target | Bundle ID |
|--------|-----------|
| Watch | `com.petehome.watch` |
| iOS | `com.petehome.ios` |
| Widgets | `com.petehome.watch.widgets` |
| App Group | `group.com.petehome.app` |

Display name on device: **petehome**.

## Build & Run

```bash
# Open in Xcode
open petehome.xcodeproj

# Build and run on watchOS simulator: ⌘R
# Clean build folder: ⇧⌘K (required after adding new Swift files)
# Delete simulator data if SwiftData schema changes:
xcrun simctl uninstall booted com.petehome.watch
xcrun simctl uninstall booted com.petehome.ios
```

No external dependencies (CocoaPods, SPM). Pure SwiftUI + SwiftData + HealthKit.

## Architecture

**MVVM with @Observable** — ViewModels use `@Observable` and `@MainActor`:

- `WorkoutViewModel` — daily workout state, exercise completion
- `HistoryViewModel` — history and analytics

**Key manager classes** (all `@MainActor` isolated singletons):

- `HealthKitManager` — live workout sessions, step counting, activity rings
- `PRManager` — personal record detection
- `CycleManager` — day-of-week to workout mapping (Monday = Day 1)

**SwiftData models:** `WorkoutRecord`, `ExerciseLog`, `PersonalRecord`

**Non-persistent models:** `Day`, `WorkoutSection`, `Exercise`

## Key Files

| File | Purpose |
|------|---------|
| `watch/Data/` | Watch session recording + HealthKit |
| `watch/ViewModels/WorkoutViewModel.swift` | Main state management |
| `ios/Data/HealthKitSyncManager.swift` | Phone → `/api/apple-health/*` ingest |
| `ios/Data/PetehomeAPI.swift` | Shared HTTP client |
| `widgets/PetehomeWidgets.swift` | Complication configuration |

Full technical documentation: `watch/project.md`

## Critical Implementation Rules

### Exercise IDs — MUST be stable strings, NOT UUIDs

```swift
// ✅ Correct - deterministic ID
let id = "\(label)-\(name.lowercased().replacing(" ", with: "-"))"

// ❌ Wrong - breaks saved data on rebuild
let id = UUID()
```

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

### Naming — Use `WorkoutSection` not `Section`

`Section` conflicts with `SwiftUI.Section`. The model is named `WorkoutSection`.

### Sheets — Handle child sheets inside child views

Don't present sheets from parent when a child sheet is already open (causes unexpected dismissal).

### Branding identifiers

- Display / UA / workout `source`: `petehome` / `petehome-ios`
- HealthKit metadata: `petehomeDayId` / `petehomeDayName` (legacy `PeteTrainDay*` may still exist on old samples)
- Widget kind: `petehomeComplication`
- Bundle IDs / App Group: see table above

## Design Guidelines

- **Colors**: Black background (#000000), green=complete, orange=in-progress/warmup, cyan=cooldown
- **Typography**: SF Pro Rounded (`.system(size:, design: .rounded)`), `.monospacedDigit()` for timers
- **Haptics**: `.success` for completion, `.click` for toggles, `.notification` for workout complete
- **Layout**: Keep action buttons visible without scrolling, test on 44mm and 49mm watch sizes

## Adding New Files

Most groups use Xcode's synchronized root folders (`watch/`, `ios/`, `widgets/`). New files under
those directories are picked up automatically. After adding files, clean build folder (⇧⌘K) if
needed.
