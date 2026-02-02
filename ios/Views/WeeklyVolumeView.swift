import SwiftUI
import SwiftData
import Charts

/// Shows weekly training volume trends
struct WeeklyVolumeView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var analytics = ProgressAnalytics.shared
    @State private var weeklyData: [ProgressAnalytics.WeeklyVolume] = []
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Volume Chart
                if weeklyData.count >= 2 {
                    VolumeChartCard(data: weeklyData)
                }
                
                // This Week Summary
                if let thisWeek = weeklyData.last {
                    ThisWeekCard(volume: thisWeek)
                }
                
                // Comparison to last week
                if weeklyData.count >= 2 {
                    WeekComparisonCard(
                        current: weeklyData[weeklyData.count - 1],
                        previous: weeklyData[weeklyData.count - 2]
                    )
                }
                
                // Weekly breakdown
                VStack(alignment: .leading, spacing: 8) {
                    Text("WEEKLY BREAKDOWN")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    ForEach(weeklyData.suffix(4).reversed()) { week in
                        WeekRow(volume: week)
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Volume")
        .onAppear {
            analytics.configure(with: modelContext)
            weeklyData = analytics.getWeeklyVolumes(weeks: 8)
        }
    }
}

// MARK: - Volume Chart

struct VolumeChartCard: View {
    let data: [ProgressAnalytics.WeeklyVolume]
    
    private var maxVolume: Double {
        data.map { $0.totalVolume }.max() ?? 1
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("VOLUME TREND")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            
            Chart(data) { week in
                BarMark(
                    x: .value("Week", week.weekStart, unit: .weekOfYear),
                    y: .value("Volume", week.totalVolume)
                )
                .foregroundStyle(
                    week.id == data.last?.id ? Color.green : Color.green.opacity(0.5)
                )
                .cornerRadius(4)
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel {
                        if let vol = value.as(Double.self) {
                            Text(ProgressAnalytics.formatVolume(vol))
                                .font(.system(size: 8, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .frame(height: 80)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.green.opacity(0.1))
        )
    }
}

// MARK: - This Week Card

struct ThisWeekCard: View {
    let volume: ProgressAnalytics.WeeklyVolume
    
    var body: some View {
        VStack(spacing: 12) {
            Text("THIS WEEK")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            
            HStack(spacing: 16) {
                VStack(spacing: 4) {
                    Text(ProgressAnalytics.formatVolume(volume.totalVolume))
                        .font(.system(.title2, design: .rounded))
                        .foregroundStyle(.white)
                    Text("lbs lifted")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                VStack(spacing: 4) {
                    Text("\(volume.workoutCount)")
                        .font(.system(.title2, design: .rounded))
                        .foregroundStyle(.green)
                    Text("workouts")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                VStack(spacing: 4) {
                    Text("\(volume.prCount)")
                        .font(.system(.title2, design: .rounded))
                        .foregroundStyle(.yellow)
                    Text("PRs")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.08))
        )
    }
}

// MARK: - Week Comparison

struct WeekComparisonCard: View {
    let current: ProgressAnalytics.WeeklyVolume
    let previous: ProgressAnalytics.WeeklyVolume
    
    private var volumeChange: Double {
        guard previous.totalVolume > 0 else { return 0 }
        return ((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100
    }
    
    private var workoutChange: Int {
        current.workoutCount - previous.workoutCount
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("VS LAST WEEK")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
            
            HStack(spacing: 0) {
                // Volume change
                HStack(spacing: 4) {
                    Image(systemName: volumeChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.system(size: 10))
                    Text(String(format: "%+.0f%%", volumeChange))
                        .font(.system(.caption, design: .rounded))
                    Text("vol")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .foregroundStyle(volumeChange >= 0 ? .green : .red)
                
                Spacer()
                
                // Workout change
                HStack(spacing: 4) {
                    Image(systemName: workoutChange >= 0 ? "arrow.up" : "arrow.down")
                        .font(.system(size: 10))
                    Text("\(workoutChange >= 0 ? "+" : "")\(workoutChange)")
                        .font(.system(.caption, design: .rounded))
                    Text("wkts")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .foregroundStyle(workoutChange >= 0 ? .green : .orange)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
    }
}

// MARK: - Week Row

struct WeekRow: View {
    let volume: ProgressAnalytics.WeeklyVolume
    
    private var weekLabel: String {
        let calendar = Calendar.current
        let now = Date()
        
        if calendar.isDate(volume.weekStart, equalTo: now, toGranularity: .weekOfYear) {
            return "This Week"
        }
        
        let weeksAgo = calendar.dateComponents([.weekOfYear], from: volume.weekStart, to: now).weekOfYear ?? 0
        if weeksAgo == 1 {
            return "Last Week"
        }
        return "\(weeksAgo) Weeks Ago"
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(weekLabel)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.white)
                
                HStack(spacing: 8) {
                    Text("\(volume.workoutCount) workouts")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    if volume.prCount > 0 {
                        HStack(spacing: 2) {
                            Image(systemName: "trophy.fill")
                                .font(.system(size: 8))
                            Text("\(volume.prCount)")
                        }
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.yellow)
                    }
                }
            }
            
            Spacer()
            
            Text(ProgressAnalytics.formatVolume(volume.totalVolume))
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(.green)
            
            Text("lbs")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.05))
        )
    }
}

#Preview {
    NavigationStack {
        WeeklyVolumeView()
    }
    .modelContainer(for: [ExerciseLog.self, PersonalRecord.self], inMemory: true)
}

