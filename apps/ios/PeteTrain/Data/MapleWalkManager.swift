import Foundation
import HealthKit
import CoreLocation
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
    private var routeBuilder: HKWorkoutRouteBuilder?
    private var routeLocationManager: CLLocationManager?
    private var routeLocationDelegate: RouteLocationDelegate?
    private var sessionStartDate: Date?

    /// Session ID for persisting markers across crashes
    private var currentSessionId: String?

    /// Count of location points added to route (for deciding whether to finish route)
    private(set) var routePointCount: Int = 0

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

            // Create standalone route builder to record GPS track
            self.routeBuilder = HKWorkoutRouteBuilder(healthStore: healthStore, device: nil)
            self.routePointCount = 0

            // Ensure LocationManager is running and boost accuracy for route recording
            let locationManager = LocationManager.shared
            print("🐾 LocationManager authorized=\(locationManager.isAuthorized) monitoring=\(locationManager.isMonitoring)")
            if locationManager.isAuthorized && !locationManager.isMonitoring {
                locationManager.startMonitoring()
            }
            locationManager.enableHighAccuracy()

            // Feed LocationManager's GPS updates into route builder (primary GPS source on watchOS)
            locationManager.onLocationUpdate = { [weak self] location in
                guard let self, self.walkState == .active, let rb = self.routeBuilder else { return }
                // Filter to reasonable accuracy
                guard location.horizontalAccuracy >= 0 && location.horizontalAccuracy < 50 else {
                    print("🐾 Route: skipping location (accuracy: \(Int(location.horizontalAccuracy))m)")
                    return
                }
                rb.insertRouteData([location]) { [weak self] _, error in
                    if let error = error {
                        print("🐾 Route insert error: \(error.localizedDescription)")
                    } else {
                        Task { @MainActor in
                            guard let self else { return }
                            self.routePointCount += 1
                            if self.routePointCount % 10 == 0 || self.routePointCount <= 3 {
                                print("🐾 Route GPS: \(self.routePointCount) points collected")
                            }
                        }
                    }
                }
            }

            // Also start dedicated high-accuracy CLLocationManager as backup
            startRouteTracking()

            walkState = .active
            startElapsedTimer()

            print("🐾 Maple Walk started (session=\(session.state.rawValue), routeBuilder=\(self.routeBuilder != nil))")
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
        guard isActive else {
            print("🐾 endWalk called but walkState=\(walkState.rawValue), ignoring")
            return
        }
        walkState = .ending
        stopElapsedTimer()

        guard let session = workoutSession, let builder = workoutBuilder else {
            print("🐾 endWalk: no session or builder — skipping workout finalization")
            walkState = .summary
            return
        }

        print("🐾 Ending walk: routePointCount=\(routePointCount), markers=\(bathroomMarkers.count)")

        session.end()
        stopRouteTracking()
        LocationManager.shared.onLocationUpdate = nil
        LocationManager.shared.restoreDefaultAccuracy()

        do {
            try await builder.endCollection(at: Date())
            let workout = try await builder.finishWorkout()
            self.finishedWorkout = workout
            print("🐾 Workout finished: id=\(workout?.uuid.uuidString ?? "nil"), duration=\(Int((workout?.duration ?? 0) / 60))m")

            // Finalize the route and attach it to the workout (must be after finishWorkout)
            if let workout = workout, let rb = self.routeBuilder, routePointCount > 0 {
                do {
                    try await rb.finishRoute(with: workout, metadata: nil)
                    print("🐾 Route saved with \(routePointCount) GPS points")
                } catch {
                    print("🐾 Failed to save route: \(error)")
                }
            } else {
                print("🐾 Route skipped: workout=\(workout != nil), routeBuilder=\(self.routeBuilder != nil), routePointCount=\(routePointCount)")
            }
            self.routeBuilder = nil
            self.routePointCount = 0
        } catch {
            print("🐾 Error finishing workout: \(error)")
            lastError = error.localizedDescription
        }

        print("🐾 endWalk complete: finishedWorkout=\(finishedWorkout != nil)")
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
        LocationManager.shared.onLocationUpdate = nil
        LocationManager.shared.restoreDefaultAccuracy()
        bathroomMarkers = []
        finishedWorkout = nil
        workoutSession = nil
        workoutBuilder = nil
        routeBuilder = nil
        stopRouteTracking()
        sessionStartDate = nil
        currentSessionId = nil
        routePointCount = 0
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

    // MARK: - Route GPS Tracking

    /// Start a dedicated high-accuracy CLLocationManager for GPS route recording
    private func startRouteTracking() {
        let delegate = RouteLocationDelegate { [weak self] locations in
            await self?.insertRouteLocations(locations)
        }
        let clManager = CLLocationManager()
        clManager.delegate = delegate
        clManager.desiredAccuracy = kCLLocationAccuracyBest
        clManager.distanceFilter = 5 // Update every 5 meters for smooth track
        clManager.startUpdatingLocation()

        self.routeLocationDelegate = delegate
        self.routeLocationManager = clManager
        print("🐾 Route GPS tracking started (best accuracy, 5m filter)")
    }

    private func stopRouteTracking() {
        let wasTracking = routeLocationManager != nil
        routeLocationManager?.stopUpdatingLocation()
        routeLocationManager?.delegate = nil
        routeLocationManager = nil
        routeLocationDelegate = nil
        if wasTracking {
            print("🐾 Route GPS tracking stopped")
        }
    }

    private func insertRouteLocations(_ locations: [CLLocation]) {
        guard walkState == .active, let routeBuilder = routeBuilder else {
            if routeBuilder == nil {
                print("🐾 Route insert skipped: routeBuilder is nil")
            }
            return
        }

        // Filter to reasonable accuracy for route data
        let good = locations.filter { $0.horizontalAccuracy >= 0 && $0.horizontalAccuracy < 50 }
        let rejected = locations.count - good.count
        if rejected > 0 {
            let worstAccuracy = locations.map { $0.horizontalAccuracy }.max() ?? 0
            print("🐾 Route: \(rejected)/\(locations.count) locations rejected (worst accuracy: \(Int(worstAccuracy))m)")
        }
        guard !good.isEmpty else { return }

        routeBuilder.insertRouteData(good) { [weak self] _, error in
            if let error = error {
                print("🐾 Route insert error: \(error.localizedDescription)")
            } else {
                Task { @MainActor in
                    guard let self else { return }
                    self.routePointCount += good.count
                    // Log periodically (every 10 points) to avoid spam
                    if self.routePointCount % 10 == 0 || self.routePointCount <= 3 {
                        print("🐾 Route GPS: \(self.routePointCount) points collected")
                    }
                }
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
                    self.stopRouteTracking()
                    LocationManager.shared.onLocationUpdate = nil
                    LocationManager.shared.restoreDefaultAccuracy()
                    if let builder = self.workoutBuilder {
                        do {
                            try await builder.endCollection(at: date)
                            let workout = try await builder.finishWorkout()
                            self.finishedWorkout = workout
                            if let workout = workout, let rb = self.routeBuilder, self.routePointCount > 0 {
                                do {
                                    try await rb.finishRoute(with: workout, metadata: nil)
                                    print("🐾 Route saved with externally ended workout (\(self.routePointCount) points)")
                                } catch {
                                    print("🐾 Route finish error: \(error.localizedDescription)")
                                }
                            }
                            self.routeBuilder = nil
                            self.routePointCount = 0
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

// MARK: - Route Location Delegate

/// Dedicated CLLocationManager delegate for high-accuracy GPS route recording.
/// Separate from LocationManager (which is configured for coarse geofencing).
private final class RouteLocationDelegate: NSObject, CLLocationManagerDelegate {
    private let onLocations: @Sendable ([CLLocation]) async -> Void

    init(onLocations: @escaping @Sendable ([CLLocation]) async -> Void) {
        self.onLocations = onLocations
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task {
            await onLocations(locations)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("🐾 Route location error: \(error.localizedDescription)")
    }
}
