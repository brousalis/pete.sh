# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pete Train is a standalone watchOS fitness tracking app for a custom 7-day training routine with HealthKit integration. The project has three targets:
- **PeteTrain** (watchOS 10+) - Primary standalone watch app using SwiftData (local only)
- **PeteTrainiOS** (iOS 15+) - Companion app with SwiftData + CloudKit sync
- **PeteTrainWidgets** - Watch face complications extension

## Build & Run

```bash
# Open in Xcode
open PeteTrain.xcodeproj

# Build and run on watchOS simulator: ⌘R
# Clean build folder: ⇧⌘K (required after adding new Swift files)
# Delete simulator data if SwiftData schema changes:
xcrun simctl uninstall booted com.petebrousalis.PeteTrain
```

No external dependencies (CocoaPods, SPM). Pure SwiftUI + SwiftData + HealthKit.

## Architecture

**MVVM with @Observable** - ViewModels use `@Observable` and `@MainActor`:
- `WorkoutViewModel` - Daily workout state, exercise completion
- `HistoryViewModel` - History and analytics

**Key Manager Classes** (all `@MainActor` isolated singletons):
- `HealthKitManager` - Live workout sessions, step counting, body weight sync
- `PRManager` - Personal record detection
- `CycleManager` - Day-of-week to workout mapping (Monday=Day 1)

**SwiftData Models**: `WorkoutRecord`, `ExerciseLog`, `PersonalRecord`, `TrainingCycle`, `BodyWeight`

**Non-Persistent Models**: `Day`, `WorkoutSection`, `Exercise` (defined in `WorkoutData.swift`)

## Key Files

| File | Purpose |
|------|---------|
| `WorkoutData.swift` | All 7 days of workout definitions |
| `WorkoutViewModel.swift` | Main state management |
| `HealthKitManager.swift` | HealthKit integration with 10ms timer updates |
| `GuidedWarmupView.swift` | Step-by-step guided workout mode |
| `DayView.swift` | Main view with live workout status |

Full technical documentation: `PeteTrain/project.md`

## Critical Implementation Rules

### Exercise IDs - MUST be stable strings, NOT UUIDs
```swift
// ✅ Correct - deterministic ID
let id = "\(label)-\(name.lowercased().replacing(" ", with: "-"))"

// ❌ Wrong - breaks saved data on rebuild
let id = UUID()
```

### Font API - NEVER use `weight:` with TextStyle
```swift
// ✅ Correct
.font(.system(.caption2, design: .rounded))
.font(.system(size: 12, weight: .bold, design: .rounded))

// ❌ Won't compile
.font(.system(.caption2, weight: .bold, design: .rounded))
```

### ForEach - ALWAYS wrap ranges in Array
```swift
// ✅ Correct
ForEach(Array(1...7), id: \.self) { num in }

// ❌ Type inference issues
ForEach(1...7, id: \.self) { num in }
```

### Guided Mode - Capture exercises at start
```swift
// ✅ Correct - capture once when sheet opens
@State private var guidedExercises: [Exercise] = []
.onChange(of: showGuidedMode) { _, newValue in
    if newValue {
        guidedExercises = section.exercises.filter { !completedIds.contains($0.id) }
    }
}

// ❌ Wrong - array shrinks as exercises complete
GuidedSectionView(exercises: section.exercises.filter { !completedIds.contains($0.id) })
```

### SwiftData Predicates - Don't use .rawValue on enums
```swift
// ✅ Correct - fetch broader, filter in memory
let results = try modelContext.fetch(descriptor)
return results.first { $0.recordType == type }

// ❌ Wrong - SwiftData doesn't support .rawValue
#Predicate<PersonalRecord> { $0.recordType.rawValue == type.rawValue }
```

### Naming - Use `WorkoutSection` not `Section`
`Section` conflicts with `SwiftUI.Section`. The model is named `WorkoutSection`.

### Sheets - Handle child sheets inside child views
Don't present sheets from parent when a child sheet is already open (causes unexpected dismissal).

## Design Guidelines

- **Colors**: Black background (#000000), green=complete, orange=in-progress/warmup, cyan=cooldown
- **Typography**: SF Pro Rounded (`.system(size:, design: .rounded)`), `.monospacedDigit()` for timers
- **Haptics**: `.success` for completion, `.click` for toggles, `.notification` for workout complete
- **Layout**: Keep action buttons visible without scrolling, test on 44mm and 49mm watch sizes

## Weekly Schedule

| Day | Weekday | Workout | HealthKit Activity |
|-----|---------|---------|-------------------|
| 1 | Monday | Strength & Power | traditionalStrengthTraining |
| 2 | Tuesday | Core & Waist Control | coreTraining |
| 3 | Wednesday | Hybrid Cardio | running |
| 4 | Thursday | Active Recovery | walking (10K steps) |
| 5 | Friday | Definition Circuit | HIIT |
| 6 | Saturday | HIIT Sprints | HIIT |
| 7 | Sunday | Active Recovery | walking (10K steps) |

## Adding New Files

Files must be added to `project.pbxproj` in multiple places:
1. `PBXBuildFile` section
2. `PBXFileReference` section
3. `PBXGroup` section
4. `PBXSourcesBuildPhase` section

After adding files manually, clean build folder (⇧⌘K). If Xcode doesn't recognize new files, delete DerivedData.
