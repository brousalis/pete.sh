import SwiftUI

struct DayPickerView: View {
    @Binding var selectedDay: Day
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List(WorkoutData.days) { day in
                Button {
                    selectedDay = day
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Day \(day.id)")
                                .font(.system(.caption, design: .rounded))
                                .foregroundStyle(.orange)
                            
                            Text(day.name)
                                .font(.system(.subheadline, design: .rounded))
                                .foregroundStyle(.white)
                            
                            Text(day.shortName)
                                .font(.system(.caption2, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                        
                        Spacer()
                        
                        if selectedDay.id == day.id {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.green)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("Select Day")
        }
    }
}

#Preview {
    DayPickerView(selectedDay: .constant(WorkoutData.day1))
}







