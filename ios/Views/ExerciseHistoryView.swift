import SwiftUI
import SwiftData
import Charts

struct ExerciseHistoryView: View {
    let exercise: Exercise
    @Environment(\.modelContext) private var modelContext
    @State private var logs: [ExerciseLog] = []
    @State private var prs: [PersonalRecord] = []
    @State private var analytics = ProgressAnalytics.shared
    @State private var progress: ProgressAnalytics.ExerciseProgress?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Exercise header
                VStack(spacing: 4) {
                    Text(exercise.name)
                        .font(.system(.headline, design: .rounded))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                    
                    if let setsReps = exercise.formattedSetsReps {
                        Text(setsReps)
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.cyan)
                    }
                }
                .padding(.vertical, 4)
                
                // Progress Chart (NEW)
                if let progress = progress, progress.dataPoints.count >= 2 {
                    ProgressChartCard(progress: progress)
                }
                
                // Quick Stats Row (NEW)
                if let progress = progress {
                    QuickStatsRow(progress: progress)
                }
                
                // Last 4 Sessions Comparison (NEW)
                if logs.count >= 2 {
                    LastSessionsCard(logs: Array(logs.prefix(4)))
                }
                
                // PRs section
                if !prs.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("PERSONAL RECORDS")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                        
                        ForEach(prs, id: \.id) { pr in
                            PRRow(pr: pr)
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.yellow.opacity(0.1))
                    )
                }
                
                // History section
                VStack(alignment: .leading, spacing: 8) {
                    Text("ALL SESSIONS")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    if logs.isEmpty {
                        Text("No logs yet")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.tertiary)
                            .padding(.vertical, 20)
                            .frame(maxWidth: .infinity)
                    } else {
                        ForEach(logs.prefix(10), id: \.id) { log in
                            LogRow(log: log)
                        }
                        
                        if logs.count > 10 {
                            Text("+\(logs.count - 10) more sessions")
                                .font(.system(.caption2, design: .rounded))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Progress")
        .onAppear {
            loadData()
        }
    }
    
    private func loadData() {
        let exerciseId = exercise.id
        analytics.configure(with: modelContext)
        
        // Load progress analytics
        progress = analytics.getExerciseProgress(exerciseId: exerciseId, exerciseName: exercise.name)
        
        // Load logs
        let logPredicate = #Predicate<ExerciseLog> { log in
            log.exerciseId == exerciseId
        }
        
        let logDescriptor = FetchDescriptor<ExerciseLog>(
            predicate: logPredicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        
        do {
            logs = try modelContext.fetch(logDescriptor)
        } catch {
            print("Failed to fetch logs: \(error)")
        }
        
        // Load PRs
        let prPredicate = #Predicate<PersonalRecord> { pr in
            pr.exerciseId == exerciseId
        }
        
        let prDescriptor = FetchDescriptor<PersonalRecord>(predicate: prPredicate)
        
        do {
            prs = try modelContext.fetch(prDescriptor)
        } catch {
            print("Failed to fetch PRs: \(error)")
        }
    }
}

// MARK: - Progress Chart

struct ProgressChartCard: View {
    let progress: ProgressAnalytics.ExerciseProgress
    
    private var chartData: [(date: Date, weight: Double)] {
        progress.dataPoints.compactMap { point in
            guard let weight = point.weight else { return nil }
            return (point.date, weight)
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("WEIGHT PROGRESS")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                if let improvement = progress.improvement {
                    HStack(spacing: 2) {
                        Image(systemName: improvement >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.system(size: 9))
                        Text(String(format: "%+.1f%%", improvement))
                            .font(.system(.caption2, design: .rounded))
                    }
                    .foregroundStyle(improvement >= 0 ? .green : .red)
                }
            }
            
            if chartData.count >= 2 {
                Chart(chartData, id: \.date) { item in
                    LineMark(
                        x: .value("Date", item.date),
                        y: .value("Weight", item.weight)
                    )
                    .foregroundStyle(Color.purple)
                    .interpolationMethod(.catmullRom)
                    
                    PointMark(
                        x: .value("Date", item.date),
                        y: .value("Weight", item.weight)
                    )
                    .foregroundStyle(Color.purple)
                    .symbolSize(20)
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            if let weight = value.as(Double.self) {
                                Text("\(Int(weight))")
                                    .font(.system(size: 8, design: .rounded))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .frame(height: 60)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.purple.opacity(0.1))
        )
    }
}

// MARK: - Quick Stats Row

struct QuickStatsRow: View {
    let progress: ProgressAnalytics.ExerciseProgress
    
    var body: some View {
        HStack(spacing: 8) {
            // Current Max
            if let currentMax = progress.currentMax {
                QuickStatItem(
                    value: ProgressAnalytics.formatWeight(currentMax),
                    label: "Current",
                    color: .white
                )
            }
            
            // Estimated 1RM
            if let oneRM = progress.estimatedOneRepMax {
                QuickStatItem(
                    value: "\(Int(round(oneRM)))",
                    label: "Est 1RM",
                    color: .orange
                )
            }
            
            // Sessions count
            QuickStatItem(
                value: "\(progress.dataPoints.count)",
                label: "Sessions",
                color: .cyan
            )
        }
    }
}

struct QuickStatItem: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 8, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.05))
        )
    }
}

// MARK: - Last Sessions Comparison

struct LastSessionsCard: View {
    let logs: [ExerciseLog]
    
    private var dateFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "M/d"
        return f
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("RECENT SESSIONS")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            
            HStack(spacing: 4) {
                ForEach(Array(logs.enumerated()), id: \.element.id) { index, log in
                    SessionMiniCard(
                        log: log,
                        dateString: dateFormatter.string(from: log.date),
                        isLatest: index == 0
                    )
                }
            }
            
            // Trend indicator
            if logs.count >= 2 {
                TrendIndicator(logs: logs)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
    }
}

struct SessionMiniCard: View {
    let log: ExerciseLog
    let dateString: String
    let isLatest: Bool
    
    var body: some View {
        VStack(spacing: 4) {
            Text(dateString)
                .font(.system(size: 8, design: .rounded))
                .foregroundStyle(isLatest ? .orange : .secondary)
            
            if let weight = log.weightUsed {
                Text("\(Int(weight))")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(isLatest ? .white : .secondary)
            } else {
                Text("-")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.tertiary)
            }
            
            if let reps = log.repsCompleted {
                Text("\(reps)r")
                    .font(.system(size: 9, design: .rounded))
                    .foregroundStyle(.cyan.opacity(isLatest ? 1 : 0.6))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isLatest ? Color.orange.opacity(0.15) : Color.clear)
        )
    }
}

struct TrendIndicator: View {
    let logs: [ExerciseLog]
    
    private var trend: (icon: String, text: String, color: Color) {
        guard logs.count >= 2,
              let currentWeight = logs[0].weightUsed,
              let previousWeight = logs[1].weightUsed else {
            return ("minus", "No weight data", .gray)
        }
        
        let diff = currentWeight - previousWeight
        if diff > 0 {
            return ("arrow.up.right", "+\(Int(diff)) lbs from last", .green)
        } else if diff < 0 {
            return ("arrow.down.right", "\(Int(diff)) lbs from last", .red)
        } else {
            return ("equal", "Same as last session", .orange)
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: trend.icon)
                .font(.system(size: 10))
            Text(trend.text)
                .font(.system(.caption2, design: .rounded))
        }
        .foregroundStyle(trend.color)
    }
}

struct PRRow: View {
    let pr: PersonalRecord
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter
    }
    
    var body: some View {
        HStack {
            Image(systemName: pr.recordType.icon)
                .font(.caption)
                .foregroundStyle(.yellow)
            
            Text(pr.recordType.label)
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(.secondary)
            
            Spacer()
            
            Text(pr.formattedValue)
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(.yellow)
            
            Text(dateFormatter.string(from: pr.date))
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.tertiary)
        }
    }
}

struct LogRow: View {
    let log: ExerciseLog
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        return formatter
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(dateFormatter.string(from: log.date))
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.white)
                
                HStack(spacing: 8) {
                    if let weight = log.weightUsed {
                        HStack(spacing: 2) {
                            Image(systemName: "scalemass")
                                .font(.system(size: 9))
                            Text(log.formattedWeight ?? "\(Int(weight))")
                                .font(.system(.caption2, design: .rounded))
                        }
                        .foregroundStyle(.purple)
                    }
                    
                    if let reps = log.repsCompleted {
                        HStack(spacing: 2) {
                            Image(systemName: "repeat")
                                .font(.system(size: 9))
                            Text("\(reps) reps")
                                .font(.system(.caption2, design: .rounded))
                        }
                        .foregroundStyle(.cyan)
                    }
                }
            }
            
            Spacer()
            
            if let difficulty = log.difficulty {
                Text(difficulty.emoji)
                    .font(.caption)
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.05))
        )
    }
}

struct StatsSummaryCard: View {
    let logs: [ExerciseLog]
    
    private var averageWeight: Double? {
        let weights = logs.compactMap { $0.weightUsed }
        guard !weights.isEmpty else { return nil }
        return weights.reduce(0, +) / Double(weights.count)
    }
    
    private var maxWeight: Double? {
        logs.compactMap { $0.weightUsed }.max()
    }
    
    private var totalSessions: Int {
        logs.count
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SUMMARY")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            
            HStack(spacing: 16) {
                VStack(spacing: 2) {
                    Text("\(totalSessions)")
                        .font(.system(.title3, design: .rounded))
                        .foregroundStyle(.white)
                    Text("sessions")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                if let avg = averageWeight {
                    VStack(spacing: 2) {
                        Text(avg == floor(avg) ? "\(Int(avg))" : String(format: "%.1f", avg))
                            .font(.system(.title3, design: .rounded))
                            .foregroundStyle(.purple)
                        Text("avg lbs")
                            .font(.system(size: 9, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
                
                if let max = maxWeight {
                    VStack(spacing: 2) {
                        Text(max == floor(max) ? "\(Int(max))" : String(format: "%.1f", max))
                            .font(.system(.title3, design: .rounded))
                            .foregroundStyle(.yellow)
                        Text("max lbs")
                            .font(.system(size: 9, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.08))
        )
    }
}

#Preview {
    NavigationStack {
        ExerciseHistoryView(
            exercise: Exercise(
                name: "Weighted Pull-ups",
                label: "A1",
                sets: 3,
                reps: "3-5"
            )
        )
    }
    .modelContainer(for: [ExerciseLog.self, PersonalRecord.self], inMemory: true)
}

