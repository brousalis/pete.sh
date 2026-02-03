import SwiftUI
import SwiftData
import WatchKit

struct WeightInputSheet: View {
    let exercise: Exercise
    let dayNumber: Int
    let onSave: (ExerciseLog) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    
    @State private var weight: Double = 0
    @State private var reps: Int = 0
    @State private var sets: Int = 0
    @State private var difficulty: ExerciseLog.Difficulty = .justRight
    @State private var notes: String = ""
    
    // Fetch last log for this exercise
    @State private var lastLog: ExerciseLog?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Exercise name
                Text(exercise.name)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                
                // Weight input
                VStack(spacing: 8) {
                    Text("WEIGHT (LBS)")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    HStack(spacing: 12) {
                        Button {
                            if weight >= 5 { weight -= 5 }
                            WKInterfaceDevice.current().play(.click)
                        } label: {
                            Image(systemName: "minus")
                                .font(.caption)
                                .frame(width: 32, height: 32)
                                .background(Circle().fill(Color.white.opacity(0.15)))
                        }
                        .buttonStyle(.plain)
                        
                        Text(weight == floor(weight) ? "\(Int(weight))" : String(format: "%.1f", weight))
                            .font(.system(size: 28, design: .rounded))
                            .foregroundStyle(.purple)
                            .monospacedDigit()
                            .frame(minWidth: 60)
                        
                        Button {
                            weight += 5
                            WKInterfaceDevice.current().play(.click)
                        } label: {
                            Image(systemName: "plus")
                                .font(.caption)
                                .frame(width: 32, height: 32)
                                .background(Circle().fill(Color.white.opacity(0.15)))
                        }
                        .buttonStyle(.plain)
                    }
                    
                    // Quick weight buttons
                    HStack(spacing: 8) {
                        ForEach([2.5, 10.0, 25.0], id: \.self) { increment in
                            Button {
                                weight += increment
                                WKInterfaceDevice.current().play(.click)
                            } label: {
                                Text("+\(increment == floor(increment) ? "\(Int(increment))" : String(format: "%.1f", increment))")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(
                                        RoundedRectangle(cornerRadius: 6)
                                            .fill(Color.purple.opacity(0.3))
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                // Reps input (if applicable)
                if exercise.sets != nil || exercise.reps != nil {
                    VStack(spacing: 8) {
                        Text("REPS")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                        
                        HStack(spacing: 12) {
                            Button {
                                if reps > 0 { reps -= 1 }
                                WKInterfaceDevice.current().play(.click)
                            } label: {
                                Image(systemName: "minus")
                                    .font(.caption)
                                    .frame(width: 28, height: 28)
                                    .background(Circle().fill(Color.white.opacity(0.15)))
                            }
                            .buttonStyle(.plain)
                            
                            Text("\(reps)")
                                .font(.system(size: 24, design: .rounded))
                                .foregroundStyle(.cyan)
                                .monospacedDigit()
                                .frame(minWidth: 40)
                            
                            Button {
                                reps += 1
                                WKInterfaceDevice.current().play(.click)
                            } label: {
                                Image(systemName: "plus")
                                    .font(.caption)
                                    .frame(width: 28, height: 28)
                                    .background(Circle().fill(Color.white.opacity(0.15)))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                // Difficulty rating
                VStack(spacing: 8) {
                    Text("HOW DID IT FEEL?")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                    
                    HStack(spacing: 8) {
                        ForEach(ExerciseLog.Difficulty.allCases, id: \.rawValue) { diff in
                            Button {
                                difficulty = diff
                                WKInterfaceDevice.current().play(.click)
                            } label: {
                                Text(diff.emoji)
                                    .font(.title3)
                                    .frame(width: 36, height: 36)
                                    .background(
                                        Circle()
                                            .fill(difficulty == diff ? Color.white.opacity(0.2) : Color.clear)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    
                    Text(difficulty.label)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                // Last time stats
                if let last = lastLog {
                    VStack(spacing: 4) {
                        Text("LAST TIME")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(.secondary)
                        
                        HStack(spacing: 12) {
                            if let w = last.weightUsed {
                                Text("\(w == floor(w) ? "\(Int(w))" : String(format: "%.1f", w)) lbs")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(.purple)
                            }
                            if let r = last.repsCompleted {
                                Text("\(r) reps")
                                    .font(.system(.caption2, design: .rounded))
                                    .foregroundStyle(.cyan)
                            }
                        }
                    }
                    .padding(.top, 8)
                }
                
                // Save button
                Button {
                    saveLog()
                } label: {
                    Text("Save")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.green)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding()
        }
        .navigationTitle("Log")
        .onAppear {
            loadLastLog()
        }
    }
    
    private func loadLastLog() {
        let exerciseId = exercise.id
        let predicate = #Predicate<ExerciseLog> { log in
            log.exerciseId == exerciseId
        }
        
        var descriptor = FetchDescriptor<ExerciseLog>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        descriptor.fetchLimit = 1
        
        do {
            let logs = try modelContext.fetch(descriptor)
            if let last = logs.first {
                lastLog = last
                // Pre-fill with last values
                if let w = last.weightUsed { weight = w }
                if let r = last.repsCompleted { reps = r }
                if let d = last.difficulty { difficulty = d }
            } else {
                // Default to exercise target if available
                if let targetSets = exercise.sets { sets = targetSets }
            }
        } catch {
            print("Failed to load last log: \(error)")
        }
    }
    
    private func saveLog() {
        let log = ExerciseLog(
            exerciseId: exercise.id,
            dayNumber: dayNumber,
            weightUsed: weight > 0 ? weight : nil,
            repsCompleted: reps > 0 ? reps : nil,
            setsCompleted: sets > 0 ? sets : nil,
            difficulty: difficulty
        )
        
        modelContext.insert(log)
        
        do {
            try modelContext.save()
            
            // Check for PR
            let prManager = PRManager.shared
            prManager.configure(with: modelContext)
            if let newPR = prManager.checkAndRecordPR(for: log) {
                // PR was set! Play special haptic
                WKInterfaceDevice.current().play(.notification)
                print("🏆 New PR: \(newPR.formattedValue) for \(exercise.name)")
            } else {
                WKInterfaceDevice.current().play(.success)
            }
            
            onSave(log)
            dismiss()
        } catch {
            print("Failed to save log: \(error)")
        }
    }
}

#Preview {
    NavigationStack {
        WeightInputSheet(
            exercise: Exercise(
                name: "Weighted Pull-ups",
                label: "A1",
                sets: 3,
                reps: "3-5"
            ),
            dayNumber: 1
        ) { _ in }
    }
    .modelContainer(for: ExerciseLog.self, inMemory: true)
}





