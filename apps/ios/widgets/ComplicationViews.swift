import SwiftUI
import WidgetKit

// MARK: - Circular
// Readiness score, or next-session sport icon on a rest/empty day.

struct CircularComplicationView: View {
    let data: SharedCoachTodayData

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.2), lineWidth: 4)

            if data.isRestDay {
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.cyan)
            } else if let score = data.readinessScore {
                Text("\(score)")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(data.readinessBlocked ? .red : .green)
            } else {
                Image(systemName: data.sportSystemImage)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.orange)
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Corner

struct CornerComplicationView: View {
    let data: SharedCoachTodayData

    var body: some View {
        ZStack {
            if let score = data.readinessScore, !data.isRestDay {
                Text("\(score)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(data.readinessBlocked ? .red : .green)
            } else {
                Image(systemName: data.isRestDay ? "moon.zzz.fill" : data.sportSystemImage)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(data.isRestDay ? .cyan : .orange)
            }
        }
        .widgetLabel {
            Text(data.inlineLabel)
        }
        .widgetAccentable()
    }
}

// MARK: - Rectangular

struct RectangularComplicationView: View {
    let data: SharedCoachTodayData

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                if let score = data.readinessScore {
                    Text("\(score)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.black)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(data.readinessBlocked ? Color.red : Color.green)
                        )
                }

                Text(data.displayTitle)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                Spacer(minLength: 0)
            }

            if let subtitle = data.displaySubtitle {
                Text(subtitle)
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            } else if data.isRestDay {
                Text("No sessions")
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Inline

struct InlineComplicationView: View {
    let data: SharedCoachTodayData

    var body: some View {
        if data.isRestDay {
            Label("Rest", systemImage: "moon.zzz.fill")
        } else {
            Label(data.inlineLabel, systemImage: data.sportSystemImage)
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

#Preview("Inline", as: .accessoryInline) {
    PetehomeComplication()
} timeline: {
    CoachTodayEntry(date: .now, data: .placeholder)
}
