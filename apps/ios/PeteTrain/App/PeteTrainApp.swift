import SwiftUI
import SwiftData

@main
struct PeteTrainApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            WorkoutRecord.self,
            ExerciseLog.self,
            PersonalRecord.self,
        ])

        // CloudKit disabled - standalone watchOS app
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    init() {
        // Load workout definitions on app launch
        // This loads from cache immediately, then refreshes from API in background
        Task { @MainActor in
            await WorkoutDataManager.shared.loadWorkouts()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}



