# Pete Train

A standalone watchOS application for tracking a custom 7-day training routine with HealthKit integration.

## Overview

Pete Train is a workout tracking app designed specifically for Apple Watch. It displays daily workouts based on the day of the week, allows marking exercises as complete, tracks workout history, and integrates with Apple Health for step counting and workout logging.

## Tech Stack

| Component          | Technology            |
| ------------------ | --------------------- |
| Platform           | watchOS 10+           |
| Language           | Swift 5.9+            |
| UI Framework       | SwiftUI               |
| Data Persistence   | SwiftData             |
| Health Integration | HealthKit             |
| Architecture       | MVVM with @Observable |

## Current Features

### ✅ Core Features

- **Day-based Workout Display**: Automatically shows the correct workout based on the day of the week (Monday = Day 1)
- **Exercise Completion Tracking**: Tap to toggle exercises complete with haptic feedback
- **Progress Indicators**: Shows X/Y exercises complete per section and per day
- **Workout History**: View past workouts with completion status and calendar view
- **Streak Tracking**: Counts consecutive days with completed workouts
- **HealthKit Integration**: Live step count, Activity rings, heart rate zones
- **Live Workout Sessions**: Start tracked workouts that contribute to Activity rings
- **Workout Logging**: Save completed workouts to Apple Health

### ✅ Guided Workout Mode

- **GuidedSectionView**: Step-by-step exercise progression through warmup, workout, or cooldown
- **Auto-Advance**: Automatically moves to next exercise after completion
- **Rest Timer**: Automatic rest countdown between exercises (configurable per exercise)
- **Skip Rest**: Option to skip rest and proceed immediately
- **Inline Weight Logging**: Log weight/reps directly within guided mode without leaving
- **Completion Screen**: Shows section completion with button to start next section
- **Exercise Capture**: Exercises are captured at session start to prevent array shrinking
- **Progress Tracking**: Shows current/total exercises with progress bar

### ✅ Exercise Management

- **Weight Tracking**: Log weight used per exercise with history
- **Skip Exercise**: Mark exercises as skipped (excluded from completion count)
- **Undo Toggle**: 5-second undo window after toggling exercises
- **Batch Complete**: Complete all exercises in a section at once
- **Batch Uncomplete**: Tap completed section checkmark to uncomplete all
- **Exercise Notes**: Expandable notes per exercise
- **Log Status Indicator**: Shows green icon if weight logged today for exercise

### ✅ Live Workout UI

- **LiveSectionNav**: Compact navigation bar showing Warm/Work/Cool progress
- **Centisecond Timer**: Displays time as `00:00.00` with 10ms updates
- **Section Progress Bars**: Mini progress bars for each section
- **Tap to Navigate**: Tap section in nav to jump to that page
- **LiveWorkoutMiniCard**: Compact timer display on section pages (tap to return to overview)

### ✅ Timers

- **Rest Timer**: Configurable countdown timer between sets with +30s, pause, skip
- **Duration Timer**: Built-in timer for duration-based exercises (planks, hangs)
- **Haptic Alerts**: Countdown warnings at 10s, 5s, and completion

### ✅ Personal Records

- **PR Tracking**: Automatically detects and records personal records for weight, reps, duration
- **PR Display**: Shows current PRs per exercise with dates
- **Exercise History**: View all logged data per exercise with summary stats

### ✅ Training Cycles

- **Deload Week Detection**: Automatic 5-week cycle tracking
- **Manual Deload**: Mark current week as deload
- **Cycle Progress**: Visual indicator of position in training cycle

### ✅ Data Management

- **Data Export**: JSON backup of all workout records, logs, and PRs
- **Dev Mode**: Override current day for testing
- **Workout Notes**: Add notes to daily workout records
- **Duration Tracking**: Automatic start/end time recording
- **Body Weight Tracking**: Daily weight logging with morning reminder card

### ✅ Watch Face Complications

- **Circular**: Progress ring with completion count or checkmark
- **Corner**: Day number badge with progress arc
- **Rectangular**: Full workout info with progress bar and status
- **Inline**: Text-only "Day 1 • 5/12" format
- **Real-time Updates**: Syncs when exercises complete
- **Active Workout State**: Shows when live workout is running

### 🔜 Future Enhancements

- iPhone companion app for detailed stats
- Data import/restore
- Custom workout builder

## Project Structure

```
PeteTrain/
├── App/
│   └── PeteTrainApp.swift          # App entry point, SwiftData container
├── Models/
│   ├── Day.swift                   # Day model (id, name, sections)
│   ├── WorkoutSection.swift        # WorkoutSection model
│   ├── Exercise.swift              # Exercise model (stable IDs, rest times)
│   ├── WorkoutRecord.swift         # SwiftData @Model for workout persistence
│   ├── ExerciseLog.swift           # SwiftData @Model for weight/rep logging
│   ├── BodyWeight.swift            # Body weight tracking model & manager
│   └── TrainingCycle.swift         # SwiftData @Model for deload tracking
├── ViewModels/
│   ├── WorkoutViewModel.swift      # Manages daily workout state
│   └── HistoryViewModel.swift      # Manages history and stats
├── Views/
│   ├── ContentView.swift           # Main tab view (vertical pages)
│   ├── DayView.swift               # Today's workout + inline exercises
│   │   ├── OverviewPage            # Main workout overview
│   │   ├── SectionCard             # Compact section display
│   │   ├── DayHeaderView           # Day name, progress, start button
│   │   ├── WorkoutStatusCard       # Live workout timer & controls
│   │   ├── LiveSectionNav          # Section navigation during workout
│   │   ├── LiveSectionButton       # Individual section button
│   │   └── BodyWeightReminderCard  # Morning weight reminder
│   ├── SectionPageView.swift       # Full section page with exercises
│   │   ├── SectionPageHeader       # Section name, progress, guided button
│   │   ├── SectionCompleteCard     # Section completion celebration
│   │   └── LiveWorkoutMiniCard     # Compact timer (tap to go to overview)
│   ├── GuidedWarmupView.swift      # Guided workout mode
│   │   ├── GuidedSectionType       # Enum for warmup/workout/cooldown
│   │   └── GuidedSectionView       # Step-by-step exercise view
│   ├── ExerciseRow.swift           # Tappable exercise with context menu
│   ├── WorkoutFlowComponents.swift # Superset grouping views
│   ├── HistoryView.swift           # Workout history with calendar view
│   ├── SettingsView.swift          # Settings, cycle info, data stats
│   ├── RestTimerView.swift         # Rest countdown timer
│   ├── WeightInputSheet.swift      # Weight/reps logging modal
│   ├── ExerciseHistoryView.swift   # Per-exercise history and PRs
│   ├── BodyWeightView.swift        # Body weight history & input
│   ├── DataExportView.swift        # JSON data export
│   ├── ActiveWorkoutView.swift     # Live workout session UI
│   ├── StepCountCard.swift         # Step counter for recovery days
│   ├── WorkoutCompleteView.swift   # Post-workout summary & Health log
│   └── DayPickerView.swift         # Manual day selection (debug)
├── Data/
│   ├── WorkoutData.swift           # Static workout definitions
│   ├── CycleManager.swift          # Day-of-week to workout mapping
│   ├── HealthKitManager.swift      # HealthKit read/write operations
│   ├── PRManager.swift             # Personal record tracking
│   ├── NotificationManager.swift   # Local notifications
│   └── DataExporter.swift          # JSON export utilities
├── Utilities/
│   └── Extensions.swift            # Color & view helpers
├── Assets.xcassets/                # App icons & accent color
├── Info.plist                      # HealthKit usage descriptions
└── PeteTrain.entitlements          # HealthKit + App Groups

PeteTrainWidgets/                   # Watch Face Complications Extension
├── PeteTrainWidgets.swift          # Widget configuration & timeline
├── ComplicationViews.swift         # Circular, Corner, Rect, Inline views
├── SharedWorkoutData.swift         # Data model for app→widget sync
├── Info.plist                      # Widget extension config
├── PeteTrainWidgets.entitlements   # App Groups entitlement
└── Assets.xcassets/                # Widget colors
```

## Data Models

### Day

```swift
struct Day: Identifiable, Hashable {
    let id: Int                      // 1-7
    let name: String                 // "Strength & Power"
    let shortName: String            // "Heavy Lifts"
    let goal: String                 // Workout goal description
    let sections: [WorkoutSection]
}
```

### WorkoutSection

```swift
struct WorkoutSection: Identifiable, Hashable {
    let id: UUID
    let name: String                 // "Warm-up", "Workout", "Cool Down"
    let subtitle: String?            // Optional instructions
    let exercises: [Exercise]
}
```

### Exercise

```swift
struct Exercise: Identifiable, Hashable {
    let id: String                   // Stable ID (e.g., "a1-weighted-pull-ups")
    let name: String
    let label: String?               // "A1", "B2", etc. (display only, removed from UI)
    let sets: Int?
    let reps: String?                // "3-5", "15-20", "Failure"
    let duration: String?            // "30-60 sec", "5 min"
    let note: String?                // Form tips
    let restSeconds: Int?            // Rest time between sets

    var isDurationBased: Bool        // Computed: has duration vs sets/reps
    var durationSeconds: Int?        // Computed: parsed duration
    var formattedSetsReps: String?   // Computed: "3×5" format
}
```

### WorkoutRecord (SwiftData)

```swift
@Model
final class WorkoutRecord {
    var id: UUID
    var date: Date
    var dayNumber: Int
    var completedExerciseIds: [String]
    var skippedExerciseIds: [String]
    var startTime: Date?
    var endTime: Date?
    var notes: String?
    var caloriesBurned: Double?

    var duration: TimeInterval?      // Computed from start/end
    var formattedDuration: String?
}
```

### ExerciseLog (SwiftData)

```swift
@Model
final class ExerciseLog {
    var id: UUID
    var date: Date
    var exerciseId: String
    var dayNumber: Int
    var weightUsed: Double?
    var repsCompleted: Int?
    var setsCompleted: Int?
    var durationSeconds: Int?
    var difficulty: Difficulty?      // .tooEasy, .justRight, .challenging, .tooHard
}
```

### PersonalRecord (SwiftData)

```swift
@Model
final class PersonalRecord {
    var id: UUID
    var exerciseId: String
    var recordType: RecordType       // .maxWeight, .maxReps, .maxDuration
    var value: Double
    var date: Date
}
```

### TrainingCycle (SwiftData)

```swift
@Model
final class TrainingCycle {
    var id: UUID
    var startDate: Date
    var weekNumber: Int              // 1-5
    var isDeloadWeek: Bool

    static let cycleLength = 5       // Deload every 5th week
    var weeksUntilDeload: Int        // Computed
}
```

## Weekly Schedule

| Day | Weekday   | Workout              | Type                |
| --- | --------- | -------------------- | ------------------- |
| 1   | Monday    | Strength & Power     | Strength Training   |
| 2   | Tuesday   | Core & Waist Control | Core Training       |
| 3   | Wednesday | Hybrid Cardio        | Running + Walking   |
| 4   | Thursday  | Active Recovery      | Walking (10K steps) |
| 5   | Friday    | Definition Circuit   | HIIT                |
| 6   | Saturday  | HIIT Sprints         | HIIT                |
| 7   | Sunday    | Active Recovery      | Walking (10K steps) |

## HealthKit Integration

### Permissions Required

- **Read**: Step Count, Heart Rate, Active Energy, Workouts, Body Mass
- **Write**: Active Energy, Workouts, Body Mass

### Workout Type Mapping

```swift
Day 1 → .traditionalStrengthTraining
Day 2 → .coreTraining
Day 3 → .running
Day 4 → .walking
Day 5 → .highIntensityIntervalTraining
Day 6 → .highIntensityIntervalTraining
Day 7 → .walking
```

### Features

- **Step Counter**: Displays on recovery days with 10,000 goal
- **Live Workouts**: Tracks heart rate, calories, duration; contributes to Activity rings
- **Manual Logging**: Save completed workout to Health app with estimated calories
- **Elapsed Timer**: Updates every 10ms for centisecond display
- **Body Weight Sync**: Two-way sync between Pete Train and Apple Health
  - Auto-sync new weight entries to HealthKit
  - Import weight from HealthKit on app launch
  - Shows sync status (heart icon) on each entry
  - Bulk sync for any unsynced entries
- **Workout Metadata**: Workouts include brand name "Pete Train" and proper location type

## Key Implementation Details

### Day Calculation (CycleManager)

```swift
// Calendar weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
// We want: Monday=1, Tuesday=2, ..., Sunday=7
if weekday == 1 { return 7 }  // Sunday
else { return weekday - 1 }    // Monday=1, etc.
```

### Exercise Completion Flow

1. User taps exercise row
2. `WorkoutViewModel.toggleExercise()` called
3. Exercise ID added/removed from `WorkoutRecord.completedExerciseIds`
4. SwiftData auto-saves
5. Haptic feedback plays (`.success` or `.click`)
6. UI updates via @Observable

### Guided Workout Flow

1. User taps play button in section header
2. `guidedExercises` array captured (incomplete exercises at that moment)
3. `GuidedSectionView` presented as sheet
4. User completes exercises one by one
5. Rest timer shows between exercises (if `restSeconds` defined)
6. On completion, shows completion screen with "Start [Next Section]" button
7. Button triggers `onStartNextSection` or `onGoToOverview` for cooldown

### Live Workout Timer

```swift
// Timer fires every 10ms for smooth centisecond display
private func startElapsedTimer() {
    elapsedTimer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { _ in
        Task { @MainActor in
            self?.elapsedTime += 0.01
        }
    }
}

// Format with centiseconds
private func formatDuration(_ duration: TimeInterval) -> String {
    let minutes = (Int(duration) % 3600) / 60
    let seconds = Int(duration) % 60
    let centiseconds = Int((duration.truncatingRemainder(dividingBy: 1)) * 100)
    return String(format: "%02d:%02d.%02d", minutes, seconds, centiseconds)
}
```

### HealthKit Authorization

- Requested on app launch in `ContentView.onAppear`
- Falls back gracefully if denied (features hidden, not crashed)
- Uses `@MainActor` isolated `HealthKitManager` singleton

## Design Guidelines

### Colors

- Background: Pure black (#000000) for OLED
- Accent: System green for completed states
- In-progress: System orange
- Warmup accent: System orange
- Cooldown accent: System cyan
- Text: White with opacity hierarchy (100%, 70%, 50%)

### Typography

- Font: SF Pro Rounded (system)
- Exercise names: `.subheadline` or `size: 14-15`
- Labels/badges: `.caption2` or `size: 10-11`
- Metrics: `.title2` with `.monospacedDigit()`
- Timer: `size: 28` with `.monospacedDigit()`

### Haptics

- Exercise toggle: `.success` (complete) / `.click` (uncomplete)
- Section complete: `.success`
- Workout complete: `.notification`
- Button press: `.click`
- Rest timer countdown: `.click` at 10s, 5s, 3s

### Layout Principles

- Keep action buttons "above the fold" (visible without scrolling)
- Use compact spacing on guided/modal views
- Prefer fixed font sizes over dynamic text styles for precise control

## ⚠️ THINGS TO AVOID

### SwiftUI Font API

**NEVER use `weight:` parameter with TextStyle-based fonts:**

```swift
// ❌ WRONG - This will NOT compile
.font(.system(.caption2, weight: .bold, design: .rounded))
.font(.system(.subheadline, weight: .semibold, design: .rounded))

// ✅ CORRECT - TextStyle fonts don't support weight parameter
.font(.system(.caption2, design: .rounded))
.font(.system(.subheadline, design: .rounded))

// ✅ CORRECT - Only numeric size fonts support weight
.font(.system(size: 12, weight: .bold, design: .rounded))
```

The `Font.system(_:design:)` API that uses TextStyle (`.caption`, `.headline`, etc.) does NOT support the `weight:` parameter. Only the `Font.system(size:weight:design:)` API with numeric sizes supports weight.

### Naming Conflicts

**NEVER use `Section` as a type name:**

- Conflicts with `SwiftUI.Section`
- Use `WorkoutSection` instead
- When using SwiftUI's Section in a file with custom types, disambiguate with `SwiftUI.Section`

### Exercise IDs

**NEVER use random UUIDs for Exercise IDs:**

```swift
// ❌ WRONG - IDs change on every app rebuild, breaking saved data
let id = UUID()

// ✅ CORRECT - Stable, deterministic IDs based on exercise identity
let id = "\(label)-\(name.lowercased().replacing(" ", with: "-"))"
```

### ForEach with Ranges

**NEVER use bare ranges in ForEach:**

```swift
// ❌ WRONG - Causes type inference issues
ForEach(1...7, id: \.self) { num in }

// ✅ CORRECT - Wrap range in Array
ForEach(Array(1...7), id: \.self) { num in }
```

### SwiftData Predicates with Enums

**NEVER use `.rawValue` in SwiftData predicates:**

```swift
// ❌ WRONG - SwiftData predicates don't support .rawValue
let predicate = #Predicate<PersonalRecord> { pr in
    pr.recordType.rawValue == type.rawValue
}

// ✅ CORRECT - Fetch broader set, filter in memory
let predicate = #Predicate<PersonalRecord> { pr in
    pr.exerciseId == exerciseId
}
let results = try modelContext.fetch(descriptor)
return results.first { $0.recordType == type }
```

### Sheet Presentation from Sheets

**AVOID presenting sheets from parent when child sheet is open:**

```swift
// ❌ WRONG - Can dismiss the child sheet unexpectedly
// Parent has: .sheet(item: $weightInputExercise)
// Child calls: onLogWeight(exercise) which sets weightInputExercise

// ✅ CORRECT - Handle sheet within the child view
struct GuidedSectionView: View {
    @State private var weightInputExercise: Exercise?

    var body: some View {
        // ...
        .sheet(item: $weightInputExercise) { exercise in
            WeightInputSheet(exercise: exercise, ...)
        }
    }
}
```

### Dynamic Exercise Arrays in Guided Mode

**NEVER filter exercises dynamically during guided mode:**

```swift
// ❌ WRONG - Array shrinks as exercises complete
.sheet(isPresented: $showGuided) {
    GuidedSectionView(
        exercises: section.exercises.filter { !completedIds.contains($0.id) }
    )
}

// ✅ CORRECT - Capture exercises when guided mode starts
@State private var guidedExercises: [Exercise] = []

.onChange(of: showGuidedMode) { _, newValue in
    if newValue {
        guidedExercises = section.exercises.filter { !completedIds.contains($0.id) }
        localShowGuided = true
    }
}
.sheet(isPresented: $localShowGuided) {
    GuidedSectionView(exercises: guidedExercises, ...)
}
```

### Xcode Project Files

**When adding new Swift files:**

1. Files MUST be added to `project.pbxproj` in THREE places:
   - `PBXBuildFile` section (for compilation)
   - `PBXFileReference` section (file reference)
   - `PBXGroup` section (folder grouping)
   - `PBXSourcesBuildPhase` section (build phase)
2. After adding files manually, clean build folder (⇧⌘K) in Xcode
3. If Xcode doesn't recognize new files, delete DerivedData

### SwiftData Model Changes

**Adding new properties to existing @Model classes can break migration:**

```swift
// ❌ RISKY - New non-optional property without migration plan
@Model class WorkoutRecord {
    var skippedExerciseIds: [String]  // Existing records don't have this!
}

// ✅ SAFER - Make new properties optional
@Model class WorkoutRecord {
    var skippedExerciseIds: [String]?  // Can be nil for old records
}

// ✅ OR - Delete simulator data during development
// xcrun simctl uninstall booted com.petebrousalis.PeteTrain
```

**During development:** Delete app from simulator when changing model schema
**For production:** Use SwiftData versioned schemas for proper migration

## Development Notes

### Building & Running

1. Open `PeteTrain.xcodeproj` in Xcode
2. Select Apple Watch target/simulator
3. Ensure HealthKit capability is enabled in Signing & Capabilities
4. Build and run (⌘R)

### Testing HealthKit

- HealthKit features only work on physical device or watchOS simulator with Health app
- Use Health app to add fake step data for testing recovery day display
- Live workout sessions require real device

### Common Issues

- **"Section" conflicts with SwiftUI.Section**: Model renamed to `WorkoutSection`
- **HealthKit authorization**: Check Info.plist has usage descriptions
- **Entitlements**: Ensure `PeteTrain.entitlements` is set in build settings
- **Font weight errors**: Remove `weight:` from TextStyle-based font calls
- **New files not recognized**: Clean build folder and restart Xcode
- **Guided mode shows wrong count**: Ensure exercises are captured at start, not filtered dynamically
- **Sheet dismisses unexpectedly**: Handle child sheets within child views, not parent
