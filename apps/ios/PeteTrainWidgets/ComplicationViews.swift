import SwiftUI
import WidgetKit

// MARK: - Circular Complication
// Shows progress ring with completion count or checkmark

struct CircularComplicationView: View {
    let data: SharedWorkoutData
    
    private var progressColor: Color {
        if data.isComplete { return .green }
        if data.progress > 0 { return .orange }
        return .gray
    }
    
    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(Color.white.opacity(0.2), lineWidth: 4)
            
            // Progress ring
            Circle()
                .trim(from: 0, to: data.progress)
                .stroke(progressColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
            
            // Center content
            if data.isComplete {
                Image(systemName: "checkmark")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.green)
            } else if data.isRecoveryDay {
                Image(systemName: "figure.walk")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.cyan)
            } else {
                VStack(spacing: 0) {
                    Text("\(data.completedCount)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    
                    Text("/\(data.totalExercises - data.skippedCount)")
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Corner Complication
// Shows day number with small progress indicator

struct CornerComplicationView: View {
    let data: SharedWorkoutData
    
    var body: some View {
        ZStack {
            // Progress arc
            if !data.isRecoveryDay {
                Circle()
                    .trim(from: 0, to: data.progress)
                    .stroke(
                        data.isComplete ? Color.green : Color.orange,
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
            }
            
            // Day info
            VStack(spacing: 0) {
                if data.isComplete {
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.green)
                } else {
                    Text("D\(data.dayNumber)")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
            }
        }
        .widgetLabel {
            if data.isRecoveryDay {
                Text("Rest")
            } else if data.isComplete {
                Text("Done!")
            } else {
                Text("\(data.completedCount)/\(data.totalExercises - data.skippedCount)")
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Rectangular Complication
// Most detailed view with workout name, progress bar, and status

struct RectangularComplicationView: View {
    let data: SharedWorkoutData
    
    private var statusText: String {
        if data.isWorkoutActive { return "In Progress" }
        if data.isComplete { return "Complete ✓" }
        if data.completedCount > 0 { return "\(data.completedCount) of \(data.totalExercises - data.skippedCount)" }
        return "Ready to start"
    }
    
    private var statusColor: Color {
        if data.isComplete { return .green }
        if data.isWorkoutActive { return .orange }
        if data.completedCount > 0 { return .orange }
        return .secondary
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            // Header row: Day badge + workout name
            HStack(spacing: 6) {
                // Day badge
                Text("D\(data.dayNumber)")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(data.isRecoveryDay ? Color.cyan : Color.orange)
                    )
                
                // Workout name
                Text(data.shortName)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                
                Spacer()
            }
            
            if data.isRecoveryDay {
                // Recovery day - show walking icon
                HStack(spacing: 4) {
                    Image(systemName: "figure.walk")
                        .font(.system(size: 11))
                        .foregroundStyle(.cyan)
                    Text("10K Steps")
                        .font(.system(size: 11, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            } else {
                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        // Background
                        Capsule()
                            .fill(Color.white.opacity(0.2))
                        
                        // Progress
                        Capsule()
                            .fill(data.isComplete ? Color.green : Color.orange)
                            .frame(width: geo.size.width * data.progress)
                    }
                }
                .frame(height: 6)
                
                // Status text
                Text(statusText)
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(statusColor)
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Inline Complication
// Simple text-only for tight spaces

struct InlineComplicationView: View {
    let data: SharedWorkoutData
    
    var body: some View {
        if data.isRecoveryDay {
            Label("Rest Day", systemImage: "figure.walk")
        } else if data.isComplete {
            Label("Day \(data.dayNumber) ✓", systemImage: "checkmark.circle.fill")
        } else {
            Label(
                "Day \(data.dayNumber) • \(data.completedCount)/\(data.totalExercises - data.skippedCount)",
                systemImage: "dumbbell.fill"
            )
        }
    }
}

// MARK: - Previews

private let previewInProgress = SharedWorkoutData(
    dayNumber: 1,
    dayName: "Density Strength",
    shortName: "Heavy Lifts",
    completedCount: 5,
    totalExercises: 12,
    skippedCount: 0,
    isWorkoutActive: true,
    lastUpdated: Date()
)

private let previewComplete = SharedWorkoutData(
    dayNumber: 1,
    dayName: "Density Strength",
    shortName: "Heavy Lifts",
    completedCount: 12,
    totalExercises: 12,
    skippedCount: 0,
    isWorkoutActive: false,
    lastUpdated: Date()
)

private let previewRecovery = SharedWorkoutData(
    dayNumber: 4,
    dayName: "Active Recovery",
    shortName: "Rest Day",
    completedCount: 0,
    totalExercises: 2,
    skippedCount: 0,
    isWorkoutActive: false,
    lastUpdated: Date()
)

#Preview("Circular - In Progress", as: .accessoryCircular) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: previewInProgress)
}

#Preview("Circular - Complete", as: .accessoryCircular) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: previewComplete)
}

#Preview("Corner", as: .accessoryCorner) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: previewInProgress)
}

#Preview("Rectangular - In Progress", as: .accessoryRectangular) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: previewInProgress)
}

#Preview("Rectangular - Recovery", as: .accessoryRectangular) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: previewRecovery)
}

#Preview("Inline", as: .accessoryInline) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: previewInProgress)
}

