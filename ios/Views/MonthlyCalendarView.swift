import SwiftUI
import SwiftData

/// Full month calendar showing workout completion
struct MonthlyCalendarView: View {
    var viewModel: HistoryViewModel
    @State private var monthOffset = 0
    
    private var calendar: Calendar { Calendar.current }
    
    private var displayMonth: Date {
        calendar.date(byAdding: .month, value: -monthOffset, to: Date()) ?? Date()
    }
    
    private var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: displayMonth)
    }
    
    private var daysInMonth: [Date?] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: displayMonth),
              let firstWeekday = calendar.dateComponents([.weekday], from: monthInterval.start).weekday else {
            return []
        }
        
        var days: [Date?] = []
        
        // Add empty slots for days before the 1st
        // Calendar weekday: 1=Sun, we want Mon=0
        let leadingEmpty = (firstWeekday + 5) % 7 // Convert to Mon=0
        for _ in 0..<leadingEmpty {
            days.append(nil)
        }
        
        // Add all days of the month
        var currentDate = monthInterval.start
        while currentDate < monthInterval.end {
            days.append(currentDate)
            currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
        }
        
        return days
    }
    
    var body: some View {
        VStack(spacing: 8) {
            // Month navigation
            HStack {
                Button {
                    monthOffset += 1
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                
                Spacer()
                
                Text(monthName)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.white)
                
                Spacer()
                
                Button {
                    if monthOffset > 0 { monthOffset -= 1 }
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(monthOffset > 0 ? .secondary : .clear)
                }
                .buttonStyle(.plain)
                .disabled(monthOffset == 0)
            }
            
            // Day headers
            HStack(spacing: 2) {
                ForEach(["M", "T", "W", "T", "F", "S", "S"], id: \.self) { day in
                    Text(day)
                        .font(.system(size: 8, design: .rounded))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            
            // Calendar grid
            let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
            
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(Array(daysInMonth.enumerated()), id: \.offset) { index, date in
                    if let date = date {
                        MonthDayCell(
                            date: date,
                            record: viewModel.record(for: date),
                            isToday: calendar.isDateInToday(date)
                        )
                    } else {
                        Color.clear
                            .frame(height: 20)
                    }
                }
            }
            
            // Legend
            HStack(spacing: 12) {
                LegendItem(color: .green, label: "Complete")
                LegendItem(color: .orange, label: "Partial")
                LegendItem(color: .red.opacity(0.5), label: "Missed")
            }
            .padding(.top, 4)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.08))
        )
    }
}

struct MonthDayCell: View {
    let date: Date
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
    }
    
    var body: some View {
        ZStack {
            Circle()
                .fill(isToday ? Color.orange.opacity(0.3) : Color.clear)
            
            Circle()
                .strokeBorder(status.color, lineWidth: 1.5)
            
            Text(dayNumber)
                .font(.system(size: 9, design: .rounded))
                .foregroundColor(status == .future ? .gray : .white)
        }
        .frame(height: 20)
    }
}

struct LegendItem: View {
    let color: Color
    let label: String
    
    var body: some View {
        HStack(spacing: 3) {
            Circle()
                .strokeBorder(color, lineWidth: 1.5)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 8, design: .rounded))
                .foregroundStyle(.tertiary)
        }
    }
}

#Preview {
    MonthlyCalendarView(viewModel: HistoryViewModel())
        .modelContainer(for: WorkoutRecord.self, inMemory: true)
}

