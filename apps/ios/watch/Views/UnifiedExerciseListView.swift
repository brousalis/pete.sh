import SwiftUI
import SwiftData
import WatchKit

/// Unified scrollable exercise list with section headers
/// Page 2 of the 3-page TabView design
struct UnifiedExerciseListView: View {
    let day: Day
    let completedIds: Set<String>
    let skippedIds: Set<String>
    let getLastWeight: (Exercise) -> Double?
    let getLastReps: ((Exercise) -> Int?)?
    let onToggle: (Exercise) -> Void
    let onSkip: (Exercise) -> Void
    let onLogWeight: (Exercise) -> Void
    let onCompleteAll: (WorkoutSection) -> Void
    let onUncompleteAll: (WorkoutSection) -> Void
    let onResetAll: () -> Void
    var onGoToOverview: (() -> Void)? = nil

    // Live workout info (optional)
    var isWorkoutActive: Bool = false
    var elapsedTime: TimeInterval = 0
    var calories: Double = 0
    var heartRate: Double = 0

    private var sections: [WorkoutSection] {
        day.sections
    }

    private var allExercises: [Exercise] {
        sections.flatMap { $0.exercises }
    }

    private var totalCompleted: Int {
        allExercises.filter { completedIds.contains($0.id) }.count
    }

    private var totalEffective: Int {
        allExercises.filter { !skippedIds.contains($0.id) }.count
    }

    private var isAllComplete: Bool {
        totalCompleted >= totalEffective && totalEffective > 0
    }

    var body: some View {
        List {
            ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                // Section header
                SectionHeaderRow(
                    section: section,
                    completedIds: completedIds,
                    skippedIds: skippedIds
                )
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: index == 0 ? 0 : 8, leading: 0, bottom: 4, trailing: 0))

                // Section exercises
                SectionExercisesView(
                    section: section,
                    completedIds: completedIds,
                    skippedIds: skippedIds,
                    getLastWeight: getLastWeight,
                    getLastReps: getLastReps,
                    onToggle: onToggle,
                    onSkip: onSkip,
                    onLogWeight: onLogWeight
                )
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 4, trailing: 0))
            }

            // Bottom action buttons
            footerButtons
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 40, trailing: 0))
        }
        .listStyle(.plain)
    }

    // MARK: - Footer Buttons

    @ViewBuilder
    private var footerButtons: some View {
        VStack(spacing: 10) {
            if isAllComplete {
                // Show reset when all complete
                Button {
                    onResetAll()
                    WKInterfaceDevice.current().play(.click)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 14))
                        Text("Reset All")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                    }
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.orange.opacity(0.15))
                    )
                }
                .buttonStyle(.plain)
            } else {
                // Show complete all when not done
                Button {
                    for section in sections {
                        onCompleteAll(section)
                    }
                    WKInterfaceDevice.current().play(.success)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                        Text("Complete All")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                    }
                    .foregroundStyle(.green)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.green.opacity(0.15))
                    )
                }
                .buttonStyle(.plain)

                // Reset button when some are completed
                if totalCompleted > 0 {
                    Button {
                        onResetAll()
                        WKInterfaceDevice.current().play(.click)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 12))
                            Text("Reset")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                        }
                        .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 4)
    }
}

// MARK: - Section Header Row

struct SectionHeaderRow: View {
    let section: WorkoutSection
    let completedIds: Set<String>
    let skippedIds: Set<String>

    private var completedCount: Int {
        section.exercises.filter { completedIds.contains($0.id) }.count
    }

    private var effectiveTotal: Int {
        section.exercises.filter { !skippedIds.contains($0.id) }.count
    }

    private var isComplete: Bool {
        completedCount >= effectiveTotal && effectiveTotal > 0
    }

    private var sectionColor: Color {
        switch section.sectionType {
        case .warmup: return .orange
        case .cooldown: return .cyan
        case .prehab: return .blue
        case .recovery: return .purple
        default: return .green
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            // Section name
            Text(section.name.uppercased())
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(isComplete ? .green : sectionColor)

            Spacer()

            // Progress count
            Text("\(completedCount)/\(effectiveTotal)")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(isComplete ? .green : .secondary)
                .monospacedDigit()

            // Completion indicator
            if isComplete {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(.green)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(sectionColor.opacity(0.1))
        )
    }
}

// MARK: - Section Exercises View (Extracted to reduce view complexity)

struct SectionExercisesView: View {
    let section: WorkoutSection
    let completedIds: Set<String>
    let skippedIds: Set<String>
    let getLastWeight: (Exercise) -> Double?
    let getLastReps: ((Exercise) -> Int?)?
    let onToggle: (Exercise) -> Void
    let onSkip: (Exercise) -> Void
    let onLogWeight: (Exercise) -> Void

    var body: some View {
        let groups = section.exercises.groupedBySupersets()

        VStack(spacing: 6) {
            ForEach(Array(groups.enumerated()), id: \.element.id) { _, group in
                SupersetGroupView(
                    group: group,
                    completedIds: completedIds,
                    skippedIds: skippedIds,
                    getLastWeight: getLastWeight,
                    getLastReps: getLastReps,
                    onToggle: onToggle,
                    onSkip: onSkip,
                    onLogWeight: onLogWeight
                )
            }
        }
        .padding(.top, 6)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        UnifiedExerciseListView(
            day: Day.placeholder(for: 1),
            completedIds: [],
            skippedIds: [],
            getLastWeight: { _ in 45 },
            getLastReps: { _ in 5 },
            onToggle: { _ in },
            onSkip: { _ in },
            onLogWeight: { _ in },
            onCompleteAll: { _ in },
            onUncompleteAll: { _ in },
            onResetAll: {}
        )
    }
}
