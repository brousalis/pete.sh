import SwiftUI

struct ActivityView: View {
    @Binding var selectedTab: Int
    @State private var selectedWorkoutId: String?

    var body: some View {
        NavigationStack {
            Group {
                if let workoutId = selectedWorkoutId {
                    ActivityDetailView(
                        workoutId: workoutId,
                        onBack: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            selectedWorkoutId = nil
                        }
                    )
                } else {
                    ActivityListView(
                        onWorkoutSelect: { id in
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            selectedWorkoutId = id
                        },
                        onOpenSync: {
                            selectedTab = 1
                        }
                    )
                }
            }
            .background(Color.black)
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ActivityView(selectedTab: .constant(2))
}
