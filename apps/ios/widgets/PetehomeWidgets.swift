import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct CoachTodayTimelineProvider: TimelineProvider {
    typealias Entry = CoachTodayEntry

    func placeholder(in context: Context) -> CoachTodayEntry {
        CoachTodayEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (CoachTodayEntry) -> Void) {
        let data = SharedCoachTodayData.load() ?? .placeholder
        completion(CoachTodayEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CoachTodayEntry>) -> Void) {
        let data = SharedCoachTodayData.load() ?? .placeholder
        let entry = CoachTodayEntry(date: Date(), data: data)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Timeline Entry

struct CoachTodayEntry: TimelineEntry {
    let date: Date
    let data: SharedCoachTodayData
}

// MARK: - Watch Complication Widget

struct PetehomeComplication: Widget {
    let kind: String = "petehomeComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CoachTodayTimelineProvider()) { entry in
            ComplicationEntryView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("petehome")
        .description("Today's coach sessions and readiness")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Entry View

struct ComplicationEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: CoachTodayEntry

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
    PetehomeComplication()
} timeline: {
    CoachTodayEntry(date: .now, data: .placeholder)
}

#Preview("Rectangular", as: .accessoryRectangular) {
    PetehomeComplication()
} timeline: {
    CoachTodayEntry(date: .now, data: .placeholder)
}
