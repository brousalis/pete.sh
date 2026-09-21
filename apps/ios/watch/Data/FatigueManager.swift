import Foundation
import SwiftData

/// Analyzes workout difficulty to detect fatigue and recommend deloads
@MainActor
@Observable
final class FatigueManager {
    
    static let shared = FatigueManager()
    
    private var modelContext: ModelContext?
    
    // MARK: - State
    var currentFatigueLevel: FatigueLevel = .normal
    var recentDifficultyAverage: Double?
    var recommendation: Recommendation?
    var weeklyDifficultyTrend: [DailyDifficulty] = []
    
    struct DailyDifficulty: Identifiable {
        let id = UUID()
        let date: Date
        let average: Double
        let count: Int
    }
    
    enum FatigueLevel: Int {
        case recovered = 1    // Avg difficulty < 2 (too easy)
        case normal = 2       // Avg difficulty 2-2.5 (just right)
        case accumulating = 3 // Avg difficulty 2.5-3 (challenging)
        case high = 4         // Avg difficulty > 3 (too hard)
        
        var label: String {
            switch self {
            case .recovered: return "Recovered"
            case .normal: return "Normal"
            case .accumulating: return "Building"
            case .high: return "Fatigued"
            }
        }
        
        var icon: String {
            switch self {
            case .recovered: return "battery.100"
            case .normal: return "battery.75"
            case .accumulating: return "battery.50"
            case .high: return "battery.25"
            }
        }
        
        var color: String {
            switch self {
            case .recovered: return "green"
            case .normal: return "blue"
            case .accumulating: return "orange"
            case .high: return "red"
            }
        }
    }
    
    struct Recommendation {
        let type: RecommendationType
        let message: String
        let detail: String?
        
        enum RecommendationType {
            case deloadNow
            case considerDeload
            case pushHarder
            case maintainCourse
            
            var icon: String {
                switch self {
                case .deloadNow: return "exclamationmark.triangle.fill"
                case .considerDeload: return "hand.raised.fill"
                case .pushHarder: return "flame.fill"
                case .maintainCourse: return "checkmark.circle.fill"
                }
            }
            
            var color: String {
                switch self {
                case .deloadNow: return "red"
                case .considerDeload: return "orange"
                case .pushHarder: return "green"
                case .maintainCourse: return "blue"
                }
            }
        }
    }
    
    // MARK: - Configuration
    
    func configure(with modelContext: ModelContext) {
        self.modelContext = modelContext
        analyze()
    }
    
    // MARK: - Analysis
    
    func analyze() {
        guard let modelContext = modelContext else { return }
        
        let calendar = Calendar.current
        let today = Date()
        
        // Get logs from the last 14 days
        guard let twoWeeksAgo = calendar.date(byAdding: .day, value: -14, to: today) else { return }
        
        // Fetch all logs from the time period (filter difficulty in memory to avoid schema issues)
        let predicate = #Predicate<ExerciseLog> { log in
            log.date >= twoWeeksAgo
        }
        
        let descriptor = FetchDescriptor<ExerciseLog>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        
        do {
            let allLogs = try modelContext.fetch(descriptor)
            // Filter to only logs with difficulty ratings
            let logs = allLogs.filter { $0.difficulty != nil }
            
            // Calculate overall average
            let difficulties = logs.compactMap { $0.difficulty?.rawValue }
            if !difficulties.isEmpty {
                recentDifficultyAverage = Double(difficulties.reduce(0, +)) / Double(difficulties.count)
            }
            
            // Calculate daily averages for trend
            var dailyData: [String: (total: Int, count: Int)] = [:]
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            
            for log in logs {
                guard let diff = log.difficulty else { continue }
                let key = dateFormatter.string(from: log.date)
                let existing = dailyData[key] ?? (0, 0)
                dailyData[key] = (existing.total + diff.rawValue, existing.count + 1)
            }
            
            weeklyDifficultyTrend = dailyData.compactMap { key, value in
                guard let date = dateFormatter.date(from: key) else { return nil }
                return DailyDifficulty(
                    date: date,
                    average: Double(value.total) / Double(value.count),
                    count: value.count
                )
            }.sorted { $0.date < $1.date }
            
            // Determine fatigue level
            if let avg = recentDifficultyAverage {
                if avg < 2.0 {
                    currentFatigueLevel = .recovered
                } else if avg < 2.5 {
                    currentFatigueLevel = .normal
                } else if avg < 3.0 {
                    currentFatigueLevel = .accumulating
                } else {
                    currentFatigueLevel = .high
                }
            }
            
            // Generate recommendation
            generateRecommendation(logs: logs)
            
        } catch {
            print("Failed to analyze fatigue: \(error)")
        }
    }
    
    private func generateRecommendation(logs: [ExerciseLog]) {
        guard let avg = recentDifficultyAverage else {
            recommendation = nil
            return
        }
        
        // Check recent trend (last 7 days vs previous 7 days)
        let calendar = Calendar.current
        let today = Date()
        guard let oneWeekAgo = calendar.date(byAdding: .day, value: -7, to: today),
              let twoWeeksAgo = calendar.date(byAdding: .day, value: -14, to: today) else {
            return
        }
        
        let recentLogs = logs.filter { $0.date >= oneWeekAgo }
        let olderLogs = logs.filter { $0.date >= twoWeeksAgo && $0.date < oneWeekAgo }
        
        let recentAvg = recentLogs.compactMap { $0.difficulty?.rawValue }
            .reduce(0, +) / max(1, recentLogs.compactMap { $0.difficulty }.count)
        let olderAvg = olderLogs.compactMap { $0.difficulty?.rawValue }
            .reduce(0, +) / max(1, olderLogs.compactMap { $0.difficulty }.count)
        
        let trendingHarder = Double(recentAvg) > Double(olderAvg) + 0.3
        
        // Decision tree
        if avg >= 3.5 {
            recommendation = Recommendation(
                type: .deloadNow,
                message: "Time for a Deload",
                detail: "You've been rating workouts as too hard. Take it easy this week."
            )
        } else if avg >= 3.0 && trendingHarder {
            recommendation = Recommendation(
                type: .considerDeload,
                message: "Consider a Deload",
                detail: "Difficulty is trending up. A recovery week might help."
            )
        } else if avg < 1.8 && logs.count >= 5 {
            recommendation = Recommendation(
                type: .pushHarder,
                message: "Ready to Push",
                detail: "Workouts feel easy. Time to increase weight or intensity."
            )
        } else {
            recommendation = Recommendation(
                type: .maintainCourse,
                message: "On Track",
                detail: nil
            )
        }
    }
    
    // MARK: - Helpers
    
    func difficultyDescription(for value: Double) -> String {
        switch value {
        case ..<1.5: return "Very Easy"
        case 1.5..<2.0: return "Easy"
        case 2.0..<2.5: return "Just Right"
        case 2.5..<3.0: return "Challenging"
        case 3.0..<3.5: return "Hard"
        default: return "Very Hard"
        }
    }
}

