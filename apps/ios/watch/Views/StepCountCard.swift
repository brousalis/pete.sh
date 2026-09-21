import SwiftUI

struct StepCountCard: View {
    let steps: Int
    let goal: Int = 10000
    
    private var progress: Double {
        min(Double(steps) / Double(goal), 1.0)
    }
    
    private var isGoalMet: Bool {
        steps >= goal
    }
    
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "figure.walk")
                .font(.body)
                .foregroundStyle(isGoalMet ? .green : .orange)
            
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(formattedSteps)
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(isGoalMet ? .green : .white)
                        .monospacedDigit()
                    
                    Text("/ \(formattedGoal)")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                // Compact progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.1))
                        
                        RoundedRectangle(cornerRadius: 2)
                            .fill(isGoalMet ? Color.green : Color.orange)
                            .frame(width: geometry.size.width * progress)
                    }
                }
                .frame(height: 4)
            }
            
            Spacer()
            
            if isGoalMet {
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.08))
        )
    }
    
    private var formattedSteps: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: steps)) ?? "\(steps)"
    }
    
    private var formattedGoal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: goal)) ?? "\(goal)"
    }
}

#Preview("In Progress") {
    StepCountCard(steps: 6543)
}

#Preview("Goal Met") {
    StepCountCard(steps: 12345)
}

