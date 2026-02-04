import SwiftUI
import SwiftData

struct HistoryView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var viewModel = HistoryViewModel()
    @State private var viewMode: ViewMode = .week
    
    enum ViewMode: String, CaseIterable {
        case week = "Week"
        case month = "Month"
        case list = "List"
        
        var icon: String {
            switch self {
            case .week: return "calendar"
            case .month: return "calendar.badge.clock"
            case .list: return "list.bullet"
            }
        }
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    StatsCard(
                        streak: viewModel.currentStreak,
                        totalWorkouts: viewModel.totalWorkouts
                    )
                    
                    // View mode toggle
                    HStack(spacing: 8) {
                        ForEach(ViewMode.allCases, id: \.rawValue) { mode in
                            Button {
                                withAnimation {
                                    viewMode = mode
                                }
                            } label: {
                                Image(systemName: mode.icon)
                                    .font(.caption)
                                    .foregroundStyle(viewMode == mode ? .orange : .secondary)
                                    .frame(width: 28, height: 28)
                                    .background(
                                        Circle()
                                            .fill(viewMode == mode ? Color.orange.opacity(0.2) : Color.clear)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                        
                        Spacer()
                        
                        Text(viewMode.rawValue)
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 4)
                    
                    if viewModel.records.isEmpty {
                        EmptyHistoryView()
                    } else {
                        switch viewMode {
                        case .week:
                            WeeklyCalendarView(viewModel: viewModel)
                        case .month:
                            MonthlyCalendarView(viewModel: viewModel)
                        case .list:
                            RecentWorkoutsView(viewModel: viewModel)
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
            .navigationTitle("History")
        }
        .onAppear {
            viewModel.configure(with: modelContext)
        }
    }
}

// MARK: - Weekly Calendar View

struct WeeklyCalendarView: View {
    var viewModel: HistoryViewModel
    @State private var weekOffset = 0
    
    private var calendar: Calendar { Calendar.current }
    
    private var weekDates: [Date] {
        let today = Date()
        guard let weekStart = calendar.date(byAdding: .weekOfYear, value: -weekOffset, to: today),
              let monday = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: weekStart)) else {
            return []
        }
        
        return (0..<7).compactMap { day in
            calendar.date(byAdding: .day, value: day, to: monday)
        }
    }
    
    private var weekLabel: String {
        if weekOffset == 0 {
            return "This Week"
        } else if weekOffset == 1 {
            return "Last Week"
        } else {
            return "\(weekOffset) Weeks Ago"
        }
    }
    
    var body: some View {
        VStack(spacing: 12) {
            // Week navigation
            HStack {
                Button {
                    weekOffset += 1
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                
                Spacer()
                
                Text(weekLabel)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                Button {
                    if weekOffset > 0 { weekOffset -= 1 }
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        // Option A: use color consistently
                        .foregroundColor(weekOffset > 0 ? .secondary : .clear)
                        // Option B (alternative): keep style and fade it
                        // .foregroundStyle(.secondary)
                        // .opacity(weekOffset > 0 ? 1 : 0)
                }
                .buttonStyle(.plain)
                .disabled(weekOffset == 0)
            }
            
            // Calendar grid
            HStack(spacing: 4) {
                ForEach(Array(weekDates.enumerated()), id: \.offset) { index, date in
                    CalendarDayCell(
                        date: date,
                        dayName: dayName(for: index),
                        record: viewModel.record(for: date),
                        isToday: calendar.isDateInToday(date)
                    )
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.08))
        )
    }
    
    private func dayName(for index: Int) -> String {
        ["M", "T", "W", "T", "F", "S", "S"][index]
    }
}

struct CalendarDayCell: View {
    let date: Date
    let dayName: String
    let record: WorkoutRecord?
    let isToday: Bool
    
    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }
    
    private var status: DayStatus {
        guard let record = record else {
            return Calendar.current.compare(date, to: Date(), toGranularity: .day) == .orderedDescending ? .future : .missed
        }
        if record.isComplete {
            return .complete
        }
        return .partial
    }
    
    enum DayStatus {
        case complete, partial, missed, future
        
        var color: Color {
            switch self {
            case .complete: return .green
            case .partial: return .orange
            case .missed: return .red.opacity(0.5)
            case .future: return .clear
            }
        }
        
        var icon: String? {
            switch self {
            case .complete: return "checkmark"
            case .partial: return "minus"
            case .missed: return "xmark"
            case .future: return nil
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 4) {
            Text(dayName)
                .font(.system(size: 9, design: .rounded))
                .foregroundStyle(.secondary)
            
            ZStack {
                Circle()
                    .fill(isToday ? Color.orange.opacity(0.3) : Color.clear)
                
                Circle()
                    .strokeBorder(status.color, lineWidth: 2)
                
                if let icon = status.icon {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(status.color)
                } else {
                    Text(dayNumber)
                        .font(.system(size: 11, design: .rounded))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 28, height: 28)
        }
        .frame(maxWidth: .infinity)
    }
}

struct StatsCard: View {
    let streak: Int
    let totalWorkouts: Int
    
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 16) {
                HistoryStatItem(
                    value: "\(streak)",
                    label: "Streak",
                    icon: "flame.fill",
                    color: streak > 0 ? .orange : .secondary
                )
                
                HistoryStatItem(
                    value: "\(totalWorkouts)",
                    label: "Workouts",
                    icon: "checkmark.seal.fill",
                    color: .green
                )
            }
            
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.08))
        )
    }
}

struct HistoryStatItem: View {
    let value: String
    let label: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            Text(value)
                .font(.system(.title2, design: .rounded))
                .foregroundStyle(.white)
            
            Text(label)
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct EmptyHistoryView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "figure.run")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            
            Text("No workouts yet")
                .font(.system(.headline, design: .rounded))
                .foregroundStyle(.secondary)
            
            Text("Complete your first workout to see it here")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 32)
    }
}

struct RecentWorkoutsView: View {
    var viewModel: HistoryViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent")
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)
            
            ForEach(viewModel.records.prefix(10)) { record in
                HistoryRow(record: record, day: viewModel.day(for: record))
            }
        }
    }
}

struct HistoryRow: View {
    let record: WorkoutRecord
    let day: Day?
    
    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        return formatter
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(day?.name ?? "Day \(record.dayNumber)")
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(.white)
                
                HStack(spacing: 8) {
                    Text(dateFormatter.string(from: record.date))
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    if let duration = record.formattedDuration {
                        Text("• \(duration)")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            
            Spacer()
            
            if record.isComplete {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                let total = day?.totalExercises ?? 0
                Text("\(record.completedExerciseIds.count)/\(total)")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.orange)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.white.opacity(0.05))
        )
    }
}

#Preview {
    HistoryView()
        .modelContainer(for: [WorkoutRecord.self, ExerciseLog.self], inMemory: true)
}
