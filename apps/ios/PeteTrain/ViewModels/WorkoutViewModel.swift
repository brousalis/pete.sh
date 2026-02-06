import Foundation
import Observation
import SwiftData
import WatchKit
import WidgetKit

@MainActor
@Observable
final class WorkoutViewModel {
    private(set) var modelContext: ModelContext?
    
    var currentDay: Day
    var todayRecord: WorkoutRecord?
    var selectedSection: WorkoutSection?
    
    // Undo support
    var lastToggledExerciseId: String?
    var canUndo: Bool { lastToggledExerciseId != nil }
    
    var completedCount: Int {
        guard let record = todayRecord else { return 0 }
        return record.completedCount(for: currentDay)
    }
    
    var skippedCount: Int {
        guard let record = todayRecord else { return 0 }
        return record.skippedCount(for: currentDay)
    }
    
    var totalExercises: Int {
        currentDay.totalExercises
    }
    
    var effectiveTotalExercises: Int {
        totalExercises - skippedCount
    }
    
    var progress: Double {
        guard effectiveTotalExercises > 0 else { return 0 }
        return Double(completedCount) / Double(effectiveTotalExercises)
    }
    
    var isWorkoutComplete: Bool {
        completedCount >= effectiveTotalExercises && effectiveTotalExercises > 0
    }
    
    var isWorkoutStarted: Bool {
        todayRecord?.startTime != nil
    }
    
    init() {
        // Get current day from dynamic data (WorkoutDataManager) or fall back to placeholder
        let dayNumber = CycleManager.currentDayNumber()
        self.currentDay = WorkoutDataManager.shared.day(for: dayNumber) ?? Day.placeholder(for: dayNumber)
        self.selectedSection = currentDay.sections.first
    }
    
    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
        loadTodayRecord()
    }
    
    func loadTodayRecord() {
        guard let modelContext = modelContext else { return }
        
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        let endOfToday = calendar.date(byAdding: .day, value: 1, to: startOfToday)!
        
        let dayNumber = currentDay.id
        
        let predicate = #Predicate<WorkoutRecord> { record in
            record.date >= startOfToday && record.date < endOfToday && record.dayNumber == dayNumber
        }
        
        let descriptor = FetchDescriptor<WorkoutRecord>(predicate: predicate)
        
        do {
            let records = try modelContext.fetch(descriptor)
            if let existingRecord = records.first {
                todayRecord = existingRecord
            } else {
                let newRecord = WorkoutRecord(dayNumber: dayNumber)
                modelContext.insert(newRecord)
                try modelContext.save()
                todayRecord = newRecord
            }
            
            // Sync to widget after loading
            syncToWidget()
        } catch {
            print("Failed to fetch/create workout record: \(error)")
        }
    }
    
    func isExerciseCompleted(_ exercise: Exercise) -> Bool {
        todayRecord?.isExerciseCompleted(exercise.id) ?? false
    }
    
    func isExerciseSkipped(_ exercise: Exercise) -> Bool {
        todayRecord?.isExerciseSkipped(exercise.id) ?? false
    }
    
    func toggleExercise(_ exercise: Exercise) {
        guard let record = todayRecord, let modelContext = modelContext else { return }
        
        // Mark workout as started on first exercise completion
        if !isWorkoutStarted {
            record.markStarted()
        }
        
        let wasCompleted = record.isExerciseCompleted(exercise.id)
        record.toggleExercise(exercise.id)
        lastToggledExerciseId = exercise.id
        
        do {
            try modelContext.save()
            playHaptic(wasCompleted ? .click : .success)
            
            // Sync to widget complication
            syncToWidget()
            
            if isWorkoutComplete {
                record.markEnded()
                try modelContext.save()
                playHaptic(.notification)
            }
        } catch {
            print("Failed to save exercise toggle: \(error)")
        }
        
        // Clear undo after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            if self?.lastToggledExerciseId == exercise.id {
                self?.lastToggledExerciseId = nil
            }
        }
    }
    
    func skipExercise(_ exercise: Exercise) {
        guard let record = todayRecord, let modelContext = modelContext else { return }
        
        record.toggleSkipExercise(exercise.id)
        
        do {
            try modelContext.save()
            playHaptic(.click)
            syncToWidget()
        } catch {
            print("Failed to save exercise skip: \(error)")
        }
    }
    
    func undoLastToggle() {
        guard let exerciseId = lastToggledExerciseId,
              let record = todayRecord,
              let modelContext = modelContext else { return }
        
        // Find the exercise
        if let exercise = currentDay.sections.flatMap({ $0.exercises }).first(where: { $0.id == exerciseId }) {
            record.toggleExercise(exercise.id)
            lastToggledExerciseId = nil
            
            do {
                try modelContext.save()
                playHaptic(.click)
                syncToWidget()
            } catch {
                print("Failed to undo: \(error)")
            }
        }
    }
    
    // Complete all exercises in a section
    func completeSection(_ section: WorkoutSection) {
        guard let record = todayRecord, let modelContext = modelContext else { return }
        
        if !isWorkoutStarted {
            record.markStarted()
        }
        
        for exercise in section.exercises {
            if !record.isExerciseCompleted(exercise.id) && !record.isExerciseSkipped(exercise.id) {
                record.toggleExercise(exercise.id)
            }
        }
        
        do {
            try modelContext.save()
            playHaptic(.success)
            syncToWidget()
            
            if isWorkoutComplete {
                record.markEnded()
                try modelContext.save()
                playHaptic(.notification)
            }
        } catch {
            print("Failed to complete section: \(error)")
        }
    }
    
    // Uncomplete all exercises in a section
    func uncompleteSection(_ section: WorkoutSection) {
        guard let record = todayRecord, let modelContext = modelContext else { return }

        for exercise in section.exercises {
            if record.isExerciseCompleted(exercise.id) {
                record.toggleExercise(exercise.id) // This will remove it from completed
            }
        }

        do {
            try modelContext.save()
            playHaptic(.click)
            syncToWidget()
        } catch {
            print("Failed to uncomplete section: \(error)")
        }
    }

    // Reset all exercises (uncomplete all sections)
    func resetAllExercises() {
        for section in currentDay.sections {
            uncompleteSection(section)
        }
    }

    // Check if entire section is complete
    func isSectionComplete(_ section: WorkoutSection) -> Bool {
        section.exercises.allSatisfy { exercise in
            isExerciseCompleted(exercise) || isExerciseSkipped(exercise)
        }
    }
    
    func refreshDay() {
        // Get current day from dynamic data (WorkoutDataManager) or fall back to placeholder
        let dayNumber = CycleManager.currentDayNumber()
        currentDay = WorkoutDataManager.shared.day(for: dayNumber) ?? Day.placeholder(for: dayNumber)
        selectedSection = currentDay.sections.first
        loadTodayRecord()
        lastToggledExerciseId = nil
        // syncToWidget is called in loadTodayRecord
    }
    
    private func playHaptic(_ type: WKHapticType) {
        WKInterfaceDevice.current().play(type)
    }
    
    // MARK: - Widget Sync
    
    /// App Group identifier for widget communication
    private static let appGroupIdentifier = "group.com.petetrain.app"
    private static let widgetStorageKey = "currentWorkoutData"
    
    /// Sync current workout state to watch face complication
    private func syncToWidget() {
        guard let defaults = UserDefaults(suiteName: Self.appGroupIdentifier) else {
            print("⚠️ Widget sync: Could not access App Group")
            return
        }

        let widgetData: [String: Any] = [
            "dayNumber": currentDay.id,
            "dayName": currentDay.name,
            "shortName": currentDay.shortName,
            "completedCount": completedCount,
            "totalExercises": totalExercises,
            "skippedCount": skippedCount,
            "lastUpdated": Date().timeIntervalSince1970
        ]
        
        defaults.set(widgetData, forKey: Self.widgetStorageKey)
        defaults.synchronize()
        
        // Reload widget timelines
        WidgetCenter.shared.reloadAllTimelines()
        
        print("✅ Widget synced: \(completedCount)/\(totalExercises)")
    }
}
