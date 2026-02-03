import SwiftUI
import SwiftData

/// Shows a quick summary of the current week's training
struct WeeklySummaryCard: View {
    @Environment(\.modelContext) private var modelContext
    @State private var summary: WeeklySummary?
    @State private var milestone: Milestone?
    
    struct WeeklySummary {
        let workoutsCompleted: Int
        let workoutsTotal: Int
        let totalVolume: Double
        let prCount: Int
        let exercisesCompleted: Int
        let avgDifficulty: Double?
        let comparisonToLastWeek: Double? // percentage
    }
    
    enum Milestone {
        case bestWeekEver(volume: Double)
        case perfectWeek
        case prStreak(count: Int)
        case volumeRecord
        
        var icon: String {
            switch self {
            case .bestWeekEver: return "trophy.fill"
            case .perfectWeek: return "star.fill"
            case .prStreak: return "flame.fill"
            case .volumeRecord: return "chart.bar.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .bestWeekEver: return .yellow
            case .perfectWeek: return .green
            case .prStreak: return .orange
            case .volumeRecord: return .purple
            }
        }
        
        var message: String {
            switch self {
            case .bestWeekEver(let vol):
                return "Best Week Ever! \(ProgressAnalytics.formatVolume(vol)) lbs"
            case .perfectWeek:
                return "Perfect Week! 💯"
            case .prStreak(let count):
                return "\(count) PRs this week! 🔥"
            case .volumeRecord:
                return "Volume Record!"
            }
        }
    }
    
    var body: some View {
        NavigationLink {
            WeeklyVolumeView()
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                // Header
                HStack {
                    Text("THIS WEEK")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                }
            
            
            if let summary = summary {
                // Milestone badge
                if let milestone = milestone {
                    HStack(spacing: 6) {
                        Image(systemName: milestone.icon)
                            .font(.caption)
                            .foregroundStyle(milestone.color)
                        
                        Text(milestone.message)
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(milestone.color)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(milestone.color.opacity(0.15))
                    )
                }
                
                // Main stats row
                HStack(spacing: 0) {
                    // Workouts
                    SummaryStatItem(
                        value: "\(summary.workoutsCompleted)/\(summary.workoutsTotal)",
                        label: "Workout",
                        color: summary.workoutsCompleted >= summary.workoutsTotal ? .green : .orange
                    )
                    
                    Divider()
                        .frame(height: 30)
                        .padding(.horizontal, 8)
                    
                    // Volume
                    SummaryStatItem(
                        value: formatVolume(summary.totalVolume),
                        label: "Volume",
                        color: .purple
                    )
                    
                    Divider()
                        .frame(height: 30)
                        .padding(.horizontal, 8)
                    
                    // PRs
                    SummaryStatItem(
                        value: "\(summary.prCount)",
                        label: "PRs",
                        color: summary.prCount > 0 ? .yellow : .secondary
                    )
                }
                
                // Comparison to last week
                if let comparison = summary.comparisonToLastWeek {
                    HStack(spacing: 4) {
                        Image(systemName: comparison >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.system(size: 9))
                        Text(String(format: "%+.0f%% volume vs last week", comparison))
                            .font(.system(.caption2, design: .rounded))
                    }
                    .foregroundStyle(comparison >= 0 ? .green : .orange)
                }
            } else {
                Text("Complete your first workout this week")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 8)
            }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.05))
            )
        }
        .buttonStyle(.plain)
        .onAppear {
            loadSummary()
        }
    }
    
    private func loadSummary() {
        let calendar = Calendar.current
        let today = Date()
        
        // Get start of this week (Monday)
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)),
              let weekEnd = calendar.date(byAdding: .day, value: 7, to: weekStart) else {
            return
        }
        
        // Get start of last week
        guard let lastWeekStart = calendar.date(byAdding: .day, value: -7, to: weekStart) else {
            return
        }
        
        // Determine how many workout days have passed this week (excluding recovery days 4 and 7)
        let dayOfWeek = calendar.component(.weekday, from: today)
        // Calendar weekday: 1=Sun, 2=Mon, ..., 7=Sat
        // Our training week: Mon=Day1, ..., Sun=Day7
        let trainingDay: Int
        if dayOfWeek == 1 { trainingDay = 7 } // Sunday
        else { trainingDay = dayOfWeek - 1 } // Mon=1, Tue=2, etc.
        
        // Count non-recovery days that have passed
        var expectedWorkouts = 0
        for day in 1...trainingDay {
            if day != 4 && day != 7 { // Not recovery days
                expectedWorkouts += 1
            }
        }
        
        // Fetch workout records for this week
        let workoutPredicate = #Predicate<WorkoutRecord> { record in
            record.date >= weekStart && record.date < weekEnd
        }
        let workoutDescriptor = FetchDescriptor<WorkoutRecord>(predicate: workoutPredicate)
        
        // Fetch exercise logs for this week (for volume)
        let logPredicate = #Predicate<ExerciseLog> { log in
            log.date >= weekStart && log.date < weekEnd
        }
        let logDescriptor = FetchDescriptor<ExerciseLog>(predicate: logPredicate)
        
        // Fetch PRs for this week
        let prPredicate = #Predicate<PersonalRecord> { pr in
            pr.date >= weekStart && pr.date < weekEnd
        }
        let prDescriptor = FetchDescriptor<PersonalRecord>(predicate: prPredicate)
        
        // Fetch last week's volume for comparison
        let lastWeekLogPredicate = #Predicate<ExerciseLog> { log in
            log.date >= lastWeekStart && log.date < weekStart
        }
        let lastWeekLogDescriptor = FetchDescriptor<ExerciseLog>(predicate: lastWeekLogPredicate)
        
        do {
            let workouts = try modelContext.fetch(workoutDescriptor)
            let completedWorkouts = workouts.filter { $0.isComplete }.count
            
            let logs = try modelContext.fetch(logDescriptor)
            var totalVolume: Double = 0
            var difficulties: [Int] = []
            var exercisesCompleted = 0
            
            for log in logs {
                let sets = log.setsCompleted ?? 1
                let reps = log.repsCompleted ?? 0
                let weight = log.weightUsed ?? 0
                totalVolume += Double(sets) * Double(reps) * weight
                exercisesCompleted += 1
                if let diff = log.difficulty {
                    difficulties.append(diff.rawValue)
                }
            }
            
            let prCount = try modelContext.fetch(prDescriptor).count
            
            // Last week volume
            let lastWeekLogs = try modelContext.fetch(lastWeekLogDescriptor)
            var lastWeekVolume: Double = 0
            for log in lastWeekLogs {
                let sets = log.setsCompleted ?? 1
                let reps = log.repsCompleted ?? 0
                let weight = log.weightUsed ?? 0
                lastWeekVolume += Double(sets) * Double(reps) * weight
            }
            
            let comparison: Double? = lastWeekVolume > 0 ? ((totalVolume - lastWeekVolume) / lastWeekVolume) * 100 : nil
            let avgDiff: Double? = difficulties.isEmpty ? nil : Double(difficulties.reduce(0, +)) / Double(difficulties.count)
            
            summary = WeeklySummary(
                workoutsCompleted: completedWorkouts,
                workoutsTotal: expectedWorkouts,
                totalVolume: totalVolume,
                prCount: prCount,
                exercisesCompleted: exercisesCompleted,
                avgDifficulty: avgDiff,
                comparisonToLastWeek: comparison
            )
            
            // Check for milestones
            checkForMilestones(
                currentVolume: totalVolume,
                prCount: prCount,
                completedWorkouts: completedWorkouts,
                expectedWorkouts: expectedWorkouts
            )
        } catch {
            print("Failed to load weekly summary: \(error)")
        }
    }
    
    private func checkForMilestones(currentVolume: Double, prCount: Int, completedWorkouts: Int, expectedWorkouts: Int) {
        // Get all-time weekly volumes to compare
        let calendar = Calendar.current
        let today = Date()
        
        // Check historical weekly volumes
        var allTimeHighVolume: Double = 0
        
        for weekOffset in 1...52 { // Check last year
            guard let weekStart = calendar.date(byAdding: .weekOfYear, value: -weekOffset, to: today),
                  let mondayOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: weekStart)),
                  let weekEnd = calendar.date(byAdding: .day, value: 7, to: mondayOfWeek) else {
                continue
            }
            
            let predicate = #Predicate<ExerciseLog> { log in
                log.date >= mondayOfWeek && log.date < weekEnd
            }
            let descriptor = FetchDescriptor<ExerciseLog>(predicate: predicate)
            
            do {
                let logs = try modelContext.fetch(descriptor)
                var weekVolume: Double = 0
                for log in logs {
                    let sets = log.setsCompleted ?? 1
                    let reps = log.repsCompleted ?? 0
                    let weight = log.weightUsed ?? 0
                    weekVolume += Double(sets) * Double(reps) * weight
                }
                allTimeHighVolume = max(allTimeHighVolume, weekVolume)
            } catch {
                continue
            }
        }
        
        // Determine milestone (priority order)
        if currentVolume > allTimeHighVolume && currentVolume > 1000 {
            milestone = .bestWeekEver(volume: currentVolume)
        } else if completedWorkouts >= expectedWorkouts && expectedWorkouts >= 5 {
            milestone = .perfectWeek
        } else if prCount >= 3 {
            milestone = .prStreak(count: prCount)
        } else {
            milestone = nil
        }
    }
    
    private func formatVolume(_ volume: Double) -> String {
        if volume >= 10000 {
            return String(format: "%.1fK", volume / 1000)
        } else if volume >= 1000 {
            return String(format: "%.1fK", volume / 1000)
        }
        return "\(Int(volume))"
    }
}

struct SummaryStatItem: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 9, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    WeeklySummaryCard()
        .padding()
        .modelContainer(for: [WorkoutRecord.self, ExerciseLog.self, PersonalRecord.self], inMemory: true)
}

