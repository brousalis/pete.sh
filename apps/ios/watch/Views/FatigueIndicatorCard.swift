import SwiftUI
import SwiftData

/// Shows fatigue level and deload recommendations
struct FatigueIndicatorCard: View {
    @Environment(\.modelContext) private var modelContext
    @State private var fatigueManager = FatigueManager.shared
    
    private var fatigueColor: Color {
        switch fatigueManager.currentFatigueLevel {
        case .recovered: return .green
        case .normal: return .blue
        case .accumulating: return .orange
        case .high: return .red
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header
            HStack {
                Image(systemName: fatigueManager.currentFatigueLevel.icon)
                    .font(.caption)
                    .foregroundStyle(fatigueColor)
                
                Text("FATIGUE")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                Text(fatigueManager.currentFatigueLevel.label)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(fatigueColor)
            }
            
            // Fatigue bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.1))
                    
                    Capsule()
                        .fill(fatigueColor)
                        .frame(width: geo.size.width * CGFloat(fatigueManager.currentFatigueLevel.rawValue) / 4.0)
                }
            }
            .frame(height: 6)
            
            // Recommendation
            if let rec = fatigueManager.recommendation {
                HStack(spacing: 6) {
                    Image(systemName: rec.type.icon)
                        .font(.system(size: 10))
                        .foregroundStyle(recommendationColor(rec.type))
                    
                    Text(rec.message)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(recommendationColor(rec.type))
                    
                    Spacer()
                }
                
                if let detail = rec.detail {
                    Text(detail)
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            
            // Average difficulty
            if let avg = fatigueManager.recentDifficultyAverage {
                HStack {
                    Text("Avg difficulty:")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.tertiary)
                    Text(fatigueManager.difficultyDescription(for: avg))
                        .font(.system(size: 9, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
        .onAppear {
            fatigueManager.configure(with: modelContext)
        }
    }
    
    private func recommendationColor(_ type: FatigueManager.Recommendation.RecommendationType) -> Color {
        switch type {
        case .deloadNow: return .red
        case .considerDeload: return .orange
        case .pushHarder: return .green
        case .maintainCourse: return .blue
        }
    }
}

#Preview {
    FatigueIndicatorCard()
        .padding()
        .modelContainer(for: [ExerciseLog.self], inMemory: true)
}

