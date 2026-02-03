import SwiftUI
import WatchKit

// MARK: - Superset Group View

struct SupersetGroupView: View {
    let group: ExerciseGroup
    let completedIds: Set<String>
    let skippedIds: Set<String>
    let getLastWeight: (Exercise) -> Double?
    let getLastReps: ((Exercise) -> Int?)?
    let onToggle: (Exercise) -> Void
    let onSkip: (Exercise) -> Void
    let onLogWeight: (Exercise) -> Void
    var onStartTimer: ((Exercise) -> Void)? = nil  // Deprecated - timer removed in UX refactor
    
    private var isGroupComplete: Bool {
        group.exercises.allSatisfy { completedIds.contains($0.id) || skippedIds.contains($0.id) }
    }
    
    private var completedCount: Int {
        group.exercises.filter { completedIds.contains($0.id) }.count
    }
    
    var body: some View {
        if group.isSuperset {
            // Superset card with grouped exercises
            VStack(alignment: .leading, spacing: 0) {
                // Superset header
                HStack(spacing: 6) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 10))
                        .foregroundStyle(.cyan)
                    
                    Text("SET \(group.groupLabel ?? "")")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.cyan)
                    
                    Spacer()
                    
                    Text("\(completedCount)/\(group.exercises.count)")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(isGroupComplete ? .green : .secondary)
                        .monospacedDigit()
                }
                .padding(.horizontal, 12)
                .padding(.top, 10)
                .padding(.bottom, 6)
                
                // Exercises in superset
                VStack(spacing: 1) {
                    ForEach(Array(group.exercises.enumerated()), id: \.element.id) { index, exercise in
                        SupersetExerciseRow(
                            exercise: exercise,
                            isCompleted: completedIds.contains(exercise.id),
                            isSkipped: skippedIds.contains(exercise.id),
                            lastWeight: getLastWeight(exercise),
                            isFirst: index == 0,
                            isLast: index == group.exercises.count - 1,
                            onToggle: { onToggle(exercise) },
                            onSkip: { onSkip(exercise) },
                            onLogWeight: { onLogWeight(exercise) },
                            onStartTimer: onStartTimer != nil ? { onStartTimer?(exercise) } : nil
                        )
                    }
                }
                
                // Rest indicator for superset
                if let rest = group.restSeconds, !isGroupComplete {
                    HStack {
                        Spacer()
                        Image(systemName: "timer")
                            .font(.system(size: 9))
                        Text("Rest \(formatRestTime(rest)) after set")
                            .font(.system(size: 9, design: .rounded))
                        Spacer()
                    }
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
                }
            }
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.cyan.opacity(0.08))
            )
        } else {
            // Single exercise (not a superset)
            if let exercise = group.exercises.first {
                ExerciseRow(
                    exercise: exercise,
                    isCompleted: completedIds.contains(exercise.id),
                    isSkipped: skippedIds.contains(exercise.id),
                    lastWeight: getLastWeight(exercise),
                    lastReps: getLastReps?(exercise),
                    onToggle: { onToggle(exercise) },
                    onSkip: { onSkip(exercise) },
                    onLogWeight: { onLogWeight(exercise) },
                    onStartTimer: exercise.restSeconds != nil && onStartTimer != nil ? { onStartTimer?(exercise) } : nil
                )
            }
        }
    }
    
    private func formatRestTime(_ seconds: Int) -> String {
        if seconds >= 60 {
            let mins = seconds / 60
            let secs = seconds % 60
            return secs > 0 ? "\(mins):\(String(format: "%02d", secs))" : "\(mins) min"
        }
        return "\(seconds)s"
    }
}

// MARK: - Superset Exercise Row (compact version for inside superset card)

struct SupersetExerciseRow: View {
    let exercise: Exercise
    let isCompleted: Bool
    let isSkipped: Bool
    let lastWeight: Double?
    let isFirst: Bool
    let isLast: Bool
    let onToggle: () -> Void
    let onSkip: () -> Void
    let onLogWeight: () -> Void
    var onStartTimer: (() -> Void)? = nil  // Deprecated - timer removed in UX refactor
    
    private var statusIcon: String {
        if isSkipped { return "forward.fill" }
        if isCompleted { return "checkmark.circle.fill" }
        return "circle"
    }
    
    private var statusColor: Color {
        if isSkipped { return .orange }
        if isCompleted { return .green }
        return .secondary
    }
    
    var body: some View {
        Button(action: onToggle) {
            HStack(alignment: .center, spacing: 8) {
                // Status icon
                Image(systemName: statusIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(statusColor)
                    .contentTransition(.symbolEffect(.replace))
                
                // Exercise info
                VStack(alignment: .leading, spacing: 2) {
                    Text(exercise.name)
                        .font(.system(.caption, design: .rounded))
                        .foregroundColor(isCompleted || isSkipped ? .secondary : .white)
                        .strikethrough(isSkipped)
                        .lineLimit(1)
                    
                    HStack(spacing: 4) {
                        if let setsReps = exercise.formattedSetsReps {
                            Text(setsReps)
                                .font(.system(size: 10, design: .rounded))
                                .foregroundStyle(.cyan.opacity(0.8))
                        }
                        
                        if let weight = lastWeight {
                            Text("·")
                                .foregroundStyle(.secondary)
                            Text("\(Int(weight))lb")
                                .font(.system(size: 10, design: .rounded))
                                .foregroundStyle(.purple)
                        }
                    }
                }
                
                Spacer(minLength: 4)
                
                // Quick action (Log when complete)
                if isCompleted && !isSkipped {
                    Button(action: onLogWeight) {
                        Image(systemName: "scalemass")
                            .font(.system(size: 10))
                            .foregroundStyle(.purple)
                            .frame(width: 24, height: 24)
                            .background(Circle().fill(Color.purple.opacity(0.2)))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                Rectangle()
                    .fill(isCompleted ? Color.green.opacity(0.05) : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Collapsible Section Header

struct CollapsibleSectionHeader: View {
    let section: WorkoutSection
    let isExpanded: Bool
    let completedCount: Int
    let totalCount: Int
    let onToggle: () -> Void
    let onCompleteAll: () -> Void
    
    private var isComplete: Bool {
        completedCount >= totalCount && totalCount > 0
    }
    
    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 8) {
                // Expand/collapse indicator
                Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(isComplete ? .green : .orange)
                    .frame(width: 14)
                
                // Section name
                Text(section.name.uppercased())
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(isComplete ? .green : .orange)
                
                Spacer()
                
                // Progress
                Text("\(completedCount)/\(totalCount)")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(isComplete ? .green : .secondary)
                    .monospacedDigit()
                
                // Complete all button (when expanded and not complete)
                if isExpanded && !isComplete {
                    Button(action: onCompleteAll) {
                        Image(systemName: "checkmark.circle")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                } else if isComplete {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - PR Celebration Overlay

struct PRCelebrationView: View {
    let exerciseName: String
    let recordType: String  // "Weight", "Reps", "Duration"
    let newValue: String
    let previousValue: String?
    let onDismiss: () -> Void
    
    @State private var showContent = false
    @State private var showConfetti = false
    
    var body: some View {
        ZStack {
            // Dimmed background
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture { onDismiss() }
            
            VStack(spacing: 16) {
                // Trophy icon with animation
                ZStack {
                    Circle()
                        .fill(Color.yellow.opacity(0.2))
                        .frame(width: 80, height: 80)
                        .scaleEffect(showConfetti ? 1.2 : 1.0)
                        .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: showConfetti)
                    
                    Text("🏆")
                        .font(.system(size: 44))
                        .scaleEffect(showContent ? 1.0 : 0.5)
                        .opacity(showContent ? 1.0 : 0)
                }
                
                Text("NEW PR!")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(.yellow)
                    .scaleEffect(showContent ? 1.0 : 0.8)
                    .opacity(showContent ? 1.0 : 0)
                
                VStack(spacing: 4) {
                    Text(exerciseName)
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    
                    Text(newValue)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(.green)
                    
                    if let previous = previousValue {
                        Text("Previous: \(previous)")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
                .opacity(showContent ? 1.0 : 0)
                
                Button(action: onDismiss) {
                    Text("Awesome!")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.yellow)
                        )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
                .opacity(showContent ? 1.0 : 0)
            }
            .padding()
        }
        .onAppear {
            WKInterfaceDevice.current().play(.notification)
            
            withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                showContent = true
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                showConfetti = true
            }
        }
    }
}

// MARK: - Previews

#Preview("Superset Group") {
    let exercises = [
        Exercise(name: "Weighted Pull-ups", label: "A1", sets: 3, reps: "3-5", restSeconds: 120),
        Exercise(name: "DB Push Press", label: "A2", sets: 3, reps: "4-6", restSeconds: 120)
    ]
    let group = ExerciseGroup(id: "A", groupLabel: "A", exercises: exercises)

    SupersetGroupView(
        group: group,
        completedIds: ["a1-weighted-pull-ups"],
        skippedIds: [],
        getLastWeight: { _ in 45 },
        getLastReps: { _ in 5 },
        onToggle: { _ in },
        onSkip: { _ in },
        onLogWeight: { _ in }
    )
    .padding()
}

#Preview("PR Celebration") {
    PRCelebrationView(
        exerciseName: "Weighted Pull-ups",
        recordType: "Weight",
        newValue: "55 lbs",
        previousValue: "50 lbs",
        onDismiss: {}
    )
}
