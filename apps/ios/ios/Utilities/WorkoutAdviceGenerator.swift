import Foundation
import SwiftUI

struct WorkoutAdvice {
    let keyTakeaways: [KeyTakeaway]
    let trainingTypeLabel: String
    let trainingTypeIcon: String
    let recoveryHours: Int
    let nextWorkoutSuggestion: String

    struct KeyTakeaway {
        let text: String
        let iconName: String
        let iconColor: Color
    }
}

enum WorkoutAdviceGenerator {
    static func generate(
        workout: ActivityWorkoutDetail,
        analytics: EnhancedWorkoutAnalyticsDetail?,
        hrZones: [ActivityHeartRateZone]?
    ) -> WorkoutAdvice {
        let peakPercent = hrZones?.first { $0.name == "peak" }?.percentage ?? 0
        let cardioPercent = hrZones?.first { $0.name == "cardio" }?.percentage ?? 0
        let fatBurnPercent = hrZones?.first { $0.name == "fatBurn" }?.percentage ?? 0

        var trainingTypeLabel: String
        var trainingTypeIcon: String
        var recoveryHours: Int
        var nextWorkoutSuggestion: String

        if peakPercent >= 50 {
            trainingTypeLabel = "VO2 Max / Speed Work"
            trainingTypeIcon = "bolt.fill"
            recoveryHours = 48
            nextWorkoutSuggestion = "Easy recovery run or rest day recommended"
        } else if peakPercent + cardioPercent >= 60 {
            trainingTypeLabel = "Threshold Training"
            trainingTypeIcon = "flame.fill"
            recoveryHours = 36
            nextWorkoutSuggestion = "Easy run or cross-training tomorrow"
        } else if cardioPercent >= 40 {
            trainingTypeLabel = "Tempo / Aerobic Power"
            trainingTypeIcon = "chart.line.uptrend.xyaxis"
            recoveryHours = 24
            nextWorkoutSuggestion = "Another moderate effort or easy run"
        } else if fatBurnPercent >= 40 {
            trainingTypeLabel = "Aerobic Base"
            trainingTypeIcon = "heart.fill"
            recoveryHours = 12
            nextWorkoutSuggestion = "Good to train again tomorrow"
        } else {
            trainingTypeLabel = "Recovery / Easy"
            trainingTypeIcon = "arrow.clockwise"
            recoveryHours = 8
            nextWorkoutSuggestion = "Ready for any workout"
        }

        if let effort = workout.effortScore {
            if effort >= 8 { recoveryHours = max(recoveryHours, 48) }
            else if effort >= 6 { recoveryHours = max(recoveryHours, 36) }
        }

        var takeaways: [WorkoutAdvice.KeyTakeaway] = []

        if let effort = workout.effortScore {
            if effort >= 8 {
                takeaways.append(.init(
                    text: "High intensity effort (\(String(format: "%.1f", effort))/10) - excellent work",
                    iconName: "bolt.fill",
                    iconColor: .green
                ))
            } else if effort >= 5 {
                takeaways.append(.init(
                    text: "Moderate effort (\(String(format: "%.1f", effort))/10) - solid training stimulus",
                    iconName: "target",
                    iconColor: .green
                ))
            } else {
                takeaways.append(.init(
                    text: "Easy effort (\(String(format: "%.1f", effort))/10) - good for recovery",
                    iconName: "arrow.clockwise",
                    iconColor: .blue
                ))
            }
        }

        if let analytics = analytics {
            let drift = analytics.cardiacDrift.driftPercentage
            if drift <= 3 {
                takeaways.append(.init(
                    text: "Excellent cardiac efficiency - only \(Int(drift))% drift",
                    iconName: "heart.fill",
                    iconColor: .green
                ))
            } else if drift <= 7 {
                takeaways.append(.init(
                    text: "Normal cardiac drift (\(Int(drift))%) - good pacing",
                    iconName: "heart.fill",
                    iconColor: .blue
                ))
            } else {
                takeaways.append(.init(
                    text: "High cardiac drift (\(Int(drift))%) - consider better pacing or hydration",
                    iconName: "exclamationmark.triangle",
                    iconColor: .orange
                ))
            }

            if analytics.cadenceAnalysis.optimalRange {
                takeaways.append(.init(
                    text: "Optimal cadence (\(Int(analytics.cadenceAnalysis.average)) spm) - efficient form",
                    iconName: "figure.run",
                    iconColor: .green
                ))
            }

            if analytics.paceAnalysis.splitStrategy == "negative" {
                takeaways.append(.init(
                    text: "Negative split achieved - strong finish",
                    iconName: "medal",
                    iconColor: .green
                ))
            }
        }

        return WorkoutAdvice(
            keyTakeaways: takeaways,
            trainingTypeLabel: trainingTypeLabel,
            trainingTypeIcon: trainingTypeIcon,
            recoveryHours: recoveryHours,
            nextWorkoutSuggestion: nextWorkoutSuggestion
        )
    }
}
