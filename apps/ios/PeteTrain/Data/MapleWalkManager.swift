import Foundation
import HealthKit
import Observation
import WatchKit

// MARK: - Walk State

enum WalkState: String {
    case idle
    case active
    case paused
    case ending
    case summary
}

/// Manages live Maple Walk sessions using HKWorkoutSession for real-time
/// HR, GPS route, distance tracking, and bathroom marker collection.
@MainActor
@Observable
final class MapleWalkManager: NSObject {

    static let shared = MapleWalkManager()

    // MARK: - Walk State

    var walkState: WalkState = .idle
    var elapsedTime: TimeInterval = 0
    var heartRate: Double = 0
    var distance: Double = 0
    var activeCalories: Double = 0
    var bathroomMarkers: [BathroomMarker] = []

    /// The finished HKWorkout after ending the session
    var finishedWorkout: HKWorkout?

    // MARK: - Errors

    var lastError: String?

    // MARK: - Private

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?
    private var sessionStartDate: Date?

    /// Session ID for persisting markers across crashes
    private var currentSessionId: String?

    private static let markersKeyPrefix = "petehome.mapleMarkers."

    private var elapsedTimer: Timer?

    // MARK: - Init

    private override init() {
        super.init()
        recoverOrphanedMarkers()
    }

    // MARK: - Public API

    var peeCount: Int {
        bathroomMarkers.filter { $0.type == .pee }.count
    }

    var poopCount: Int {
        bathroomMarkers.filter { $0.type == .poop }.count
    }

    var isActive: Bool {
        walkState == .active || walkState == .paused
    }

    func startWalk() async {
        guard walkState == .idle else { return }

        lastError = nil

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .hiking
        configuration.locationType = .outdoor

        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()

            builder.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            session.delegate = self
            builder.delegate = self

            self.workoutSession = session
            self.workoutBuilder = builder
            self.sessionStartDate = Date()
            self.currentSessionId = UUID().uuidString
            self.bathroomMarkers = []
            self.elapsedTime = 0
            self.heartRate = 0
            self.distance = 0
            self.activeCalories = 0
            self.finishedWorkout = nil

            session.startActivity(with: Date())
            try await builder.beginCollection(at: Date())

            // Ensure LocationManager is providing GPS updates
            let locationManager = LocationManager.shared
            if locationManager.isAuthorized && !locationManager.isMonitoring {
                locationManager.startMonitoring()
            }

            walkState = .active
            startElapsedTimer()

            print("🐾 Maple Walk started")
        } catch {
            lastError = error.localizedDescription
            print("🐾 Failed to start Maple Walk: \(error)")
        }
    }

    func pauseWalk() {
        guard walkState == .active else { return }
        workoutSession?.pause()
        walkState = .paused
        stopElapsedTimer()
        print("🐾 Maple Walk paused")
    }

    func resumeWalk() {
        guard walkState == .paused else { return }
        workoutSession?.resume()
        walkState = .active
        startElapsedTimer()
        print("🐾 Maple Walk resumed")
    }

    func endWalk() async {
        guard isActive else { return }
        walkState = .ending
        stopElapsedTimer()

        guard let session = workoutSession, let builder = workoutBuilder else {
            walkState = .summary
            return
        }

        session.end()

        do {
            try await builder.endCollection(at: Date())
            let workout = try await builder.finishWorkout()
            self.finishedWorkout = workout

            if let workout = workout {
                print("🐾 Maple Walk ended: \(Int(workout.duration / 60))m")
            }
        } catch {
            print("🐾 Error finishing workout: \(error)")
            lastError = error.localizedDescription
        }

        walkState = .summary
    }

    func markBathroom(type: BathroomMarkerType) {
        guard isActive else { return }

        guard let location = LocationManager.shared.currentLocation else {
            WKInterfaceDevice.current().play(.failure)
            lastError = "No GPS signal"
            print("🐾 No GPS for bathroom marker")
            return
        }

        let marker = BathroomMarker(
            type: type,
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude
        )
        bathroomMarkers.append(marker)
        persistMarkers()

        WKInterfaceDevice.current().play(.click)
        print("🐾 Marked \(type.emoji) at \(marker.latitude), \(marker.longitude)")
    }

    /// Discard the walk data (markers only; HealthKit workout persists)
    func discardWalk() {
        clearPersistedMarkers()
        resetState()
    }

    /// Reset to idle after sync or discard
    func resetState() {
        bathroomMarkers = []
        finishedWorkout = nil
        workoutSession = nil
        workoutBuilder = nil
        sessionStartDate = nil
        currentSessionId = nil
        elapsedTime = 0
        heartRate = 0
        distance = 0
        activeCalories = 0
        lastError = nil
        walkState = .idle
    }

    // MARK: - Marker Persistence (crash resilience)

    private func persistMarkers() {
        guard let sessionId = currentSessionId else { return }
        let key = Self.markersKeyPrefix + sessionId
        if let data = try? JSONEncoder().encode(bathroomMarkers) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    func clearPersistedMarkers() {
        guard let sessionId = currentSessionId else { return }
        let key = Self.markersKeyPrefix + sessionId
        UserDefaults.standard.removeObject(forKey: key)
    }

    /// Persist markers keyed by HealthKit workout UUID for sync retry survival
    func persistMarkersForWorkout(workoutUUID: String) {
        let key = Self.markersKeyPrefix + workoutUUID
        if let data = try? JSONEncoder().encode(bathroomMarkers) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    /// Retrieve persisted markers for a specific workout UUID (used by retry queue)
    static func loadPersistedMarkers(workoutUUID: String) -> [BathroomMarker]? {
        let key = markersKeyPrefix + workoutUUID
        guard let data = UserDefaults.standard.data(forKey: key),
              let markers = try? JSONDecoder().decode([BathroomMarker].self, from: data),
              !markers.isEmpty else {
            return nil
        }
        return markers
    }

    static func clearPersistedMarkers(workoutUUID: String) {
        let key = markersKeyPrefix + workoutUUID
        UserDefaults.standard.removeObject(forKey: key)
    }

    /// On launch, check for orphaned marker sets from crashed sessions
    private func recoverOrphanedMarkers() {
        let defaults = UserDefaults.standard
        let allKeys = defaults.dictionaryRepresentation().keys
        let markerKeys = allKeys.filter { $0.hasPrefix(Self.markersKeyPrefix) }

        for key in markerKeys {
            if let data = defaults.data(forKey: key),
               let markers = try? JSONDecoder().decode([BathroomMarker].self, from: data),
               !markers.isEmpty {
                print("🐾 Found \(markers.count) orphaned markers for key: \(key)")
            }
        }
    }

    // MARK: - Elapsed Timer

    private func startElapsedTimer() {
        stopElapsedTimer()
        elapsedTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, let start = self.sessionStartDate else { return }
                self.elapsedTime = Date().timeIntervalSince(start)
            }
        }
    }

    private func stopElapsedTimer() {
        elapsedTimer?.invalidate()
        elapsedTimer = nil
    }

    // MARK: - Metric Updates from Builder

    private func updateMetrics() {
        guard let builder = workoutBuilder else { return }

        if let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate),
           let hrStats = builder.statistics(for: hrType) {
            let hrUnit = HKUnit.count().unitDivided(by: .minute())
            if let mostRecent = hrStats.mostRecentQuantity() {
                heartRate = mostRecent.doubleValue(for: hrUnit)
            }
        }

        if let distType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning),
           let distStats = builder.statistics(for: distType) {
            if let sum = distStats.sumQuantity() {
                distance = sum.doubleValue(for: .meter())
            }
        }

        if let calType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned),
           let calStats = builder.statistics(for: calType) {
            if let sum = calStats.sumQuantity() {
                activeCalories = sum.doubleValue(for: .kilocalorie())
            }
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension MapleWalkManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        Task { @MainActor in
            switch toState {
            case .ended:
                if self.walkState != .ending && self.walkState != .summary {
                    print("🐾 Walk ended externally")
                    self.stopElapsedTimer()
                    if let builder = self.workoutBuilder {
                        do {
                            try await builder.endCollection(at: date)
                            let workout = try await builder.finishWorkout()
                            self.finishedWorkout = workout
                        } catch {
                            print("🐾 Error finishing externally ended workout: \(error)")
                        }
                    }
                    self.walkState = .summary
                }
            case .paused:
                if self.walkState == .active {
                    self.walkState = .paused
                    self.stopElapsedTimer()
                }
            case .running:
                if self.walkState == .paused {
                    self.walkState = .active
                    self.startElapsedTimer()
                }
            default:
                break
            }
        }
    }

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        Task { @MainActor in
            print("🐾 Workout session failed: \(error)")
            self.lastError = error.localizedDescription
        }
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension MapleWalkManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Workout events (pauses, etc.) handled by session delegate
    }

    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        Task { @MainActor in
            self.updateMetrics()
        }
    }
}
