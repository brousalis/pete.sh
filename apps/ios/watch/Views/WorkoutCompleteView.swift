import SwiftUI
import WatchKit

struct WorkoutCompleteView: View {
    let day: Day
    let duration: TimeInterval
    @Environment(\.dismiss) private var dismiss
    
    @State private var healthKit = HealthKitManager.shared
    @State private var isSaving = false
    @State private var didSave = false
    @State private var estimatedCalories: Double = 0
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Success Icon
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.green)
                
                Text("Workout Complete!")
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(.white)
                
                Text(day.name)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(.secondary)
                
                // Stats
                VStack(spacing: 12) {
                    HStack {
                        Label("Duration", systemImage: "clock")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(formatDuration(duration))
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    
                    HStack {
                        Label("Est. Calories", systemImage: "flame.fill")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(Int(estimatedCalories)) cal")
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(.orange)
                    }
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.08))
                )
                
                Spacer(minLength: 16)
                
                // Save to Health Button
                if !didSave {
                    Button {
                        saveToHealth()
                    } label: {
                        HStack {
                            if isSaving {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "heart.fill")
                                Text("Save to Health")
                            }
                        }
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.red)
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(isSaving)
                } else {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Saved to Health")
                    }
                    .font(.system(.subheadline,  design: .rounded))
                    .foregroundStyle(.green)
                }
                
                // Done Button
                Button {
                    dismiss()
                } label: {
                    Text("Done")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.15))
                        )
                }
                .buttonStyle(.plain)
            }
            .padding()
        }
        .navigationTitle("Complete")
        .navigationBarBackButtonHidden(true)
        .onAppear {
            calculateEstimatedCalories()
        }
    }
    
    private func calculateEstimatedCalories() {
        // Rough estimates based on workout type and duration
        let caloriesPerMinute: Double
        switch day.id {
        case 1: caloriesPerMinute = 8   // Strength
        case 2: caloriesPerMinute = 5   // Core
        case 3: caloriesPerMinute = 10  // Cardio
        case 4: caloriesPerMinute = 4   // Recovery walk
        case 5: caloriesPerMinute = 12  // HIIT Circuit
        case 6: caloriesPerMinute = 14  // HIIT Sprints
        case 7: caloriesPerMinute = 4   // Recovery walk
        default: caloriesPerMinute = 6
        }
        
        estimatedCalories = (duration / 60) * caloriesPerMinute
    }
    
    private func saveToHealth() {
        isSaving = true
        WKInterfaceDevice.current().play(.click)
        
        Task {
            do {
                try await healthKit.logCompletedWorkout(for: day, duration: duration, calories: estimatedCalories)
                await MainActor.run {
                    isSaving = false
                    didSave = true
                    WKInterfaceDevice.current().play(.success)
                }
            } catch {
                print("Failed to save workout: \(error)")
                await MainActor.run {
                    isSaving = false
                    WKInterfaceDevice.current().play(.failure)
                }
            }
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
}

#Preview {
    WorkoutCompleteView(day: Day.placeholder(for: 1), duration: 2700)
}






