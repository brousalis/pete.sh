import Foundation
import SwiftData

@Model
final class WorkoutRecord {
    var id: UUID = UUID()
    var date: Date = Date()
    var dayNumber: Int = 1
    var completedExerciseIds: [String] = []
    var skippedExerciseIds: [String] = []
    
    // Enhanced tracking
    var startTime: Date?
    var endTime: Date?
    var notes: String?
    
    // HealthKit workout data (synced from live workouts)
    var caloriesBurned: Double?
    var distanceMeters: Double?
    var averageHeartRate: Double?
    var healthKitWorkoutId: UUID?  // Links to HKWorkout for reference
    
    // Routine version tracking (links to fitness_routine_versions.id on the web app)
    var routineVersionId: String?
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        dayNumber: Int,
        completedExerciseIds: [String] = [],
        skippedExerciseIds: [String] = [],
        startTime: Date? = nil,
        endTime: Date? = nil,
        notes: String? = nil,
        caloriesBurned: Double? = nil,
        distanceMeters: Double? = nil,
        averageHeartRate: Double? = nil,
        healthKitWorkoutId: UUID? = nil
    ) {
        self.id = id
        self.date = date
        self.dayNumber = dayNumber
        self.completedExerciseIds = completedExerciseIds
        self.skippedExerciseIds = skippedExerciseIds
        self.startTime = startTime
        self.endTime = endTime
        self.notes = notes
        self.caloriesBurned = caloriesBurned
        self.distanceMeters = distanceMeters
        self.averageHeartRate = averageHeartRate
        self.healthKitWorkoutId = healthKitWorkoutId
    }
    
    /// Check if workout is complete for a given day
    /// Pass the day from WorkoutDataManager.shared.day(for: dayNumber)
    func isComplete(for day: Day) -> Bool {
        let totalRequired = day.totalExercises - skippedExerciseIds.count
        return completedExerciseIds.count >= totalRequired
    }
    
    var duration: TimeInterval? {
        guard let start = startTime, let end = endTime else { return nil }
        return end.timeIntervalSince(start)
    }
    
    var formattedDuration: String? {
        guard let duration = duration else { return nil }
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
    
    func isExerciseCompleted(_ exerciseId: String) -> Bool {
        completedExerciseIds.contains(exerciseId)
    }
    
    func isExerciseSkipped(_ exerciseId: String) -> Bool {
        skippedExerciseIds.contains(exerciseId)
    }
    
    func toggleExercise(_ exerciseId: String) {
        if completedExerciseIds.contains(exerciseId) {
            completedExerciseIds.removeAll { $0 == exerciseId }
        } else {
            completedExerciseIds.append(exerciseId)
            // Remove from skipped if it was skipped
            skippedExerciseIds.removeAll { $0 == exerciseId }
        }
    }
    
    func toggleSkipExercise(_ exerciseId: String) {
        if skippedExerciseIds.contains(exerciseId) {
            skippedExerciseIds.removeAll { $0 == exerciseId }
        } else {
            skippedExerciseIds.append(exerciseId)
            // Remove from completed if it was completed
            completedExerciseIds.removeAll { $0 == exerciseId }
        }
    }
    
    func completedCount(for day: Day) -> Int {
        let allExerciseIds = day.sections.flatMap { $0.exercises.map { $0.id } }
        return completedExerciseIds.filter { allExerciseIds.contains($0) }.count
    }
    
    func skippedCount(for day: Day) -> Int {
        let allExerciseIds = day.sections.flatMap { $0.exercises.map { $0.id } }
        return skippedExerciseIds.filter { allExerciseIds.contains($0) }.count
    }
    
    // Mark workout as started
    func markStarted() {
        if startTime == nil {
            startTime = Date()
        }
    }
    
    // Mark workout as ended
    func markEnded() {
        endTime = Date()
    }
    
    // Sync workout data from HealthKit
    func syncFromHealthKit(
        calories: Double?,
        distance: Double?,
        avgHeartRate: Double?,
        workoutId: UUID?,
        duration: TimeInterval?
    ) {
        if let calories = calories, calories > 0 {
            self.caloriesBurned = calories
        }
        if let distance = distance, distance > 0 {
            self.distanceMeters = distance
        }
        if let avgHeartRate = avgHeartRate, avgHeartRate > 0 {
            self.averageHeartRate = avgHeartRate
        }
        if let workoutId = workoutId {
            self.healthKitWorkoutId = workoutId
        }
        // Update end time based on actual workout duration if we have start time
        if let duration = duration, let start = startTime {
            self.endTime = start.addingTimeInterval(duration)
        }
    }
    
    // Formatted distance in km
    var formattedDistance: String? {
        guard let distance = distanceMeters, distance > 0 else { return nil }
        let km = distance / 1000
        return String(format: "%.2f km", km)
    }
    
    // Formatted calories
    var formattedCalories: String? {
        guard let calories = caloriesBurned, calories > 0 else { return nil }
        return "\(Int(calories)) cal"
    }
    
    // Formatted heart rate
    var formattedHeartRate: String? {
        guard let hr = averageHeartRate, hr > 0 else { return nil }
        return "\(Int(hr)) bpm avg"
    }
}



