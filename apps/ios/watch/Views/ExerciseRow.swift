import SwiftUI
import WatchKit

struct ExerciseRow: View {
    let exercise: Exercise
    let isCompleted: Bool
    let isSkipped: Bool
    let lastWeight: Double?
    let lastReps: Int?
    let onToggle: () -> Void
    let onSkip: () -> Void
    let onLogWeight: () -> Void
    var onStartTimer: (() -> Void)? = nil  // Deprecated - timer removed in UX refactor

    init(
        exercise: Exercise,
        isCompleted: Bool,
        isSkipped: Bool = false,
        lastWeight: Double? = nil,
        lastReps: Int? = nil,
        onToggle: @escaping () -> Void,
        onSkip: @escaping () -> Void = {},
        onLogWeight: @escaping () -> Void = {},
        onStartTimer: (() -> Void)? = nil
    ) {
        self.exercise = exercise
        self.isCompleted = isCompleted
        self.isSkipped = isSkipped
        self.lastWeight = lastWeight
        self.lastReps = lastReps
        self.onToggle = onToggle
        self.onSkip = onSkip
        self.onLogWeight = onLogWeight
        self.onStartTimer = onStartTimer
    }
    
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
    
    private var backgroundColor: Color {
        if isSkipped { return Color.orange.opacity(0.1) }
        if isCompleted { return Color.green.opacity(0.1) }
        return Color.white.opacity(0.05)
    }
    
    var body: some View {
        Button(action: onToggle) {
            HStack(alignment: .center, spacing: 10) {
                // Status icon
                    Image(systemName: statusIcon)
                    .font(.system(size: 20))
                        .foregroundStyle(statusColor)
                        .contentTransition(.symbolEffect(.replace))
                    
                // Exercise info
                VStack(alignment: .leading, spacing: 2) {
                        Text(exercise.name)
                        .font(.system(size: 14, design: .rounded))
                            .foregroundColor(isCompleted || isSkipped ? .secondary : .white)
                            .strikethrough(isSkipped)
                        .lineLimit(1)
                        
                        // Metadata row
                    HStack(spacing: 3) {
                            if let setsReps = exercise.formattedSetsReps {
                                Text(setsReps)
                                .foregroundStyle(.cyan)
                        } else if let duration = exercise.duration {
                            Text(duration)
                                    .foregroundStyle(.cyan)
                            }
                            
                        // Last session
                            if let weight = lastWeight {
                                Text("·")
                                    .foregroundStyle(.secondary)
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 7))
                                .foregroundStyle(.purple)
                                Text("\(Int(weight))lb")
                                    .foregroundStyle(.purple)
                            }
                    }
                    .font(.system(size: 11, design: .rounded))
                    .lineLimit(1)
                            }
                
                Spacer(minLength: 0)
                
                // Quick action button - show log weight when completed
                if !isSkipped && isCompleted {
                    Button(action: onLogWeight) {
                        Image(systemName: "scalemass")
                            .font(.system(size: 12))
                            .foregroundStyle(.purple)
                            .frame(width: 28, height: 28)
                            .background(Circle().fill(Color.purple.opacity(0.2)))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 10)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(backgroundColor)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview("Incomplete") {
    ExerciseRow(
        exercise: Exercise(
            name: "Weighted Neutral-Grip Pull-ups",
            label: "A1",
            sets: 3,
            reps: "3-5",
            note: "Use the Counter-Balance Rule.",
            restSeconds: 120
        ),
        isCompleted: false,
        onToggle: {},
        onSkip: {},
        onLogWeight: {}
    )
    .padding()
}

#Preview("Completed") {
    ExerciseRow(
        exercise: Exercise(
            name: "Box Jumps",
            label: "B2",
            sets: 3,
            reps: "5",
            note: "Step down, do not jump down.",
            restSeconds: 90
        ),
        isCompleted: true,
        lastWeight: 25,
        onToggle: {},
        onSkip: {},
        onLogWeight: {}
    )
    .padding()
}

#Preview("Skipped") {
    ExerciseRow(
        exercise: Exercise(
            name: "Dead Hang",
            duration: "30-60 sec"
        ),
        isCompleted: false,
        isSkipped: true,
        onToggle: {},
        onSkip: {},
        onLogWeight: {}
    )
    .padding()
}


