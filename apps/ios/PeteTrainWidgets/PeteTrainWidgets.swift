//
//  PeteTrainWidgets.swift
//  PeteTrainWidgets
//
//  Created by Pete Brousalis on 1/5/26.
//

import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct WorkoutTimelineProvider: TimelineProvider {
    typealias Entry = WorkoutEntry
    
    func placeholder(in context: Context) -> WorkoutEntry {
        WorkoutEntry(date: Date(), data: .placeholder)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (WorkoutEntry) -> Void) {
        let data = SharedWorkoutData.load() ?? .placeholder
        let entry = WorkoutEntry(date: Date(), data: data)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<WorkoutEntry>) -> Void) {
        let data = SharedWorkoutData.load() ?? createDefaultData()
        let entry = WorkoutEntry(date: Date(), data: data)
        
        // Refresh every 15 minutes or on next update
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    /// Create default data based on current day
    private func createDefaultData() -> SharedWorkoutData {
        let calendar = Calendar.current
        var weekday = calendar.component(.weekday, from: Date())
        // Convert: Sunday=1...Saturday=7 → Monday=1...Sunday=7
        weekday = weekday == 1 ? 7 : weekday - 1
        
        let dayNames = [
            (1, "Density Strength", "Heavy Lifts"),
            (2, "Waist, Core & Posture", "Core"),
            (3, "Fat Incinerator", "Hybrid Cardio"),
            (4, "Active Recovery", "Rest Day"),
            (5, "The Climber's Circuit", "Metabolic"),
            (6, "HIIT Sprints", "Sprints"),
            (7, "Active Recovery", "Rest Day")
        ]
        
        let (_, name, shortName) = dayNames[weekday - 1]
        let totalExercises = [12, 9, 7, 2, 10, 3, 2][weekday - 1]
        
        return SharedWorkoutData(
            dayNumber: weekday,
            dayName: name,
            shortName: shortName,
            completedCount: 0,
            totalExercises: totalExercises,
            skippedCount: 0,
            isWorkoutActive: false,
            lastUpdated: Date()
        )
    }
}

// MARK: - Timeline Entry

struct WorkoutEntry: TimelineEntry {
    let date: Date
    let data: SharedWorkoutData
}

// MARK: - Watch Complication Widget

struct PeteTrainComplication: Widget {
    let kind: String = "PeteTrainComplication"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WorkoutTimelineProvider()) { entry in
            ComplicationEntryView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Pete Train")
        .description("Track today's workout progress")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Main Entry View (Routes to appropriate complication style)

struct ComplicationEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: WorkoutEntry
    
    var body: some View {
        switch family {
        case .accessoryCircular:
            CircularComplicationView(data: entry.data)
        case .accessoryCorner:
            CornerComplicationView(data: entry.data)
        case .accessoryRectangular:
            RectangularComplicationView(data: entry.data)
        case .accessoryInline:
            InlineComplicationView(data: entry.data)
        default:
            CircularComplicationView(data: entry.data)
        }
    }
}

// MARK: - Previews

#Preview("Circular", as: .accessoryCircular) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: .placeholder)
}

#Preview("Rectangular", as: .accessoryRectangular) {
    PeteTrainComplication()
} timeline: {
    WorkoutEntry(date: .now, data: .placeholder)
}
