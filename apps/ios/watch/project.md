# petehome Watch

A watchOS companion that shows today's coach plan. Apple Fitness / the system Workout
app owns recording during sessions; petehome on the wrist is a **read-only day plan**.

## Role

| Surface | Owns |
|---------|------|
| Watch petehome | Today's sessions, readiness, PT blocks (from API) |
| Apple Fitness / Workout | Live workout recording, intervals (via WorkoutKit from iPhone) |
| iPhone petehome | HealthKit → `/api/apple-health/*` ingest, WorkoutKit scheduling |
| Web `/coach` | Plan edits, check-in, chat |

## Screens

1. **Today** — readiness strip, session list (blocked sessions stay visible with reason), PT blocks
2. **Settings** — server URL / API key (from Keychain), test connection, refresh, cache status

Pull to refresh and auto-refresh on activation (15-minute throttle).

## Data

- `GET /api/coach/watch/today` via `PetehomeAPI.fetchCoachToday()`
- `CoachTodayStore` caches the full payload in the App Group and publishes a
  `SharedCoachTodayData` snapshot for complications
- Offline: last cache is shown; stale badge after 24 hours

## Tech

| Component | Technology |
|-----------|------------|
| Platform | watchOS 10+ |
| UI | SwiftUI |
| State | `@Observable` (`CoachTodayStore`) |
| Persistence | App Group `UserDefaults` (no SwiftData) |

## Key files

| File | Purpose |
|------|---------|
| `Data/CoachTodayStore.swift` | Load / refresh / cache / widget publish |
| `Data/PetehomeAPI.swift` | Coach today GET + connection test |
| `Views/CoachTodayView.swift` | Today list + detail sheets |
| `Views/CoachSettingsView.swift` | Credentials + refresh |
| `widgets/SharedCoachTodayData.swift` | Complication snapshot (mirrored in `watch/Data/`) |

## Build

```bash
open petehome.xcodeproj
# Select Watch scheme → ⌘R
# After schema changes: ⇧⌘K
```

Bundle ID: `com.petehome.watch` · App Group: `group.com.petehome.app`

## Design

- Black background, SF Rounded, sport accent orange, readiness green/red
- `.monospacedDigit()` on scores and durations
- Blocked sessions greyed with lock + reason — never hidden
