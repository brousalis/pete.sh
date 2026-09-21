import SwiftUI
import Charts
import MapKit

// MARK: - Zone Colored HR Chart

struct ZoneColoredHrChartView: View {
    let data: [TimeSeriesPoint]
    let hrZonesConfig: HrZonesConfigDetail
    let hrAverage: Int?

    private let maxChartPoints = 200

    var body: some View {
        let chartData = Array(data.prefix(maxChartPoints))
        Chart {
            ForEach(Array(chartData.enumerated()), id: \.offset) { _, point in
                if let hr = point.hr {
                    LineMark(
                        x: .value("Time", point.elapsedSeconds),
                        y: .value("HR", hr)
                    )
                    .foregroundStyle(.red)
                    .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
                }
            }
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: 300)) { _ in
                AxisGridLine()
                AxisValueLabel(format: IntegerFormatStyle<Int>.number)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Heart rate over time. Average: \(hrAverage ?? 0) BPM")
    }
}

// MARK: - HR Zones Bar

struct HrZonesBarView: View {
    let zones: [ActivityHeartRateZone]

    var body: some View {
        GeometryReader { geo in
            HStack(spacing: 2) {
                ForEach(zones.filter { $0.percentage > 0 }, id: \.name) { zone in
                    Rectangle()
                        .fill(colorForZone(zone.name))
                        .frame(width: max(4, geo.size.width * CGFloat(zone.percentage) / 100))
                }
            }
        }
        .frame(height: 8)
        .clipShape(Capsule())

        HStack(spacing: 12) {
            ForEach(zones, id: \.name) { zone in
                HStack(spacing: 4) {
                    Circle()
                        .fill(colorForZone(zone.name))
                        .frame(width: 8, height: 8)
                    Text("\(zone.name) \(zone.percentage)%")
                        .font(.system(size: 10, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func colorForZone(_ name: String) -> Color {
        switch name {
        case "rest": return .gray
        case "warmup": return .blue
        case "fatBurn": return .green
        case "cardio": return .orange
        case "peak": return .red
        default: return .gray
        }
    }
}

// MARK: - Time Series Chart (HR + Cadence)

struct TimeSeriesChartView: View {
    let data: [TimeSeriesPoint]
    let showHr: Bool
    let showCadence: Bool

    private let maxChartPoints = 200

    var body: some View {
        let chartData = Array(data.prefix(maxChartPoints))
        Chart {
            if showHr {
                ForEach(Array(chartData.enumerated()), id: \.offset) { _, point in
                    if let hr = point.hr {
                        LineMark(
                            x: .value("Time", point.elapsedSeconds),
                            y: .value("HR", hr)
                        )
                        .foregroundStyle(.red)
                        .lineStyle(StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
                    }
                }
            }
            if showCadence {
                ForEach(Array(chartData.enumerated()), id: \.offset) { _, point in
                    if let cadence = point.cadence {
                        LineMark(
                            x: .value("Time", point.elapsedSeconds),
                            y: .value("Cadence", cadence)
                        )
                        .foregroundStyle(.blue)
                        .lineStyle(StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
                        .symbol(Circle())
                    }
                }
            }
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: 300)) { _ in
                AxisGridLine()
                AxisValueLabel(format: IntegerFormatStyle<Int>.number)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
    }
}

// MARK: - Splits Chart

struct SplitsChartView: View {
    let splits: [WorkoutSplitAnalytics]

    var body: some View {
        Chart {
            ForEach(splits, id: \.splitNumber) { split in
                BarMark(
                    x: .value("Split", "\(split.splitNumber)"),
                    y: .value("Pace", split.avgPace)
                )
                .foregroundStyle(.green)
            }
        }
        .chartXAxis {
            AxisMarks { _ in
                AxisValueLabel()
                AxisGridLine()
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
    }
}

// MARK: - Workout Structure Bar (Active vs Paused)

struct WorkoutStructureBarView: View {
    let events: [WorkoutEventDetail]
    let totalDuration: Int
    let startDate: String

    var body: some View {
        let segments = computeSegments()
        GeometryReader { geo in
            HStack(spacing: 0) {
                ForEach(segments, id: \.offset) { seg in
                    Rectangle()
                        .fill(seg.isActive ? Color.green : Color.gray)
                        .frame(width: max(2, geo.size.width * CGFloat(seg.duration) / CGFloat(max(1, totalDuration))))
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func computeSegments() -> [(offset: Int, duration: Int, isActive: Bool)] {
        guard let start = startDate.iso8601Date else {
            return [(0, totalDuration, true)]
        }
        var segments: [(Int, Int, Bool)] = []
        var lastTime = start.timeIntervalSince1970
        var active = true

        for event in events.sorted(by: { ($0.timestamp.iso8601Date ?? .distantPast) < ($1.timestamp.iso8601Date ?? .distantPast) }) {
            guard let ts = event.timestamp.iso8601Date else { continue }
            let elapsed = Int(ts.timeIntervalSince1970 - lastTime)
            if elapsed > 0 {
                segments.append((segments.count, elapsed, active))
            }
            if event.eventType.contains("pause") {
                active = false
            } else if event.eventType.contains("resume") {
                active = true
            }
            lastTime = ts.timeIntervalSince1970
        }
        let remaining = totalDuration - segments.reduce(0) { $0 + $1.1 }
        if remaining > 0 {
            segments.append((segments.count, remaining, active))
        }
        if segments.isEmpty {
            segments = [(0, totalDuration, true)]
        }
        return segments.enumerated().map { ($0.offset, $0.element.1, $0.element.2) }
    }
}

// MARK: - Workout Route Map

struct WorkoutRouteMapView: View {
    let samples: [RouteSampleDetail]

    var body: some View {
        Map {
            if samples.count >= 2 {
                MapPolyline(coordinates: samples.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) })
                    .stroke(.blue, lineWidth: 4)
            }
        }
        .mapStyle(.standard(elevation: .realistic))
    }
}
