import SwiftUI

@main
struct PetehomeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .task {
                    await CoachTodayStore.shared.load()
                }
        }
    }
}
