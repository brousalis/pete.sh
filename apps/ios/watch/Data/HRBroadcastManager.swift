import Foundation
import HealthKit
import Observation
import WatchKit
import WatchConnectivity

// MARK: - Broadcast State

enum BroadcastState: String {
    case idle
    case active
    case starting
    case ending
}

/// Streams the wrist heart rate to the paired iPhone over WatchConnectivity so the
/// iPhone can re-broadcast it as a standard BLE Heart Rate sensor (e.g. to a Coospo CS600).
///
/// watchOS cannot act as a BLE peripheral, so this manager only handles the
/// measurement + relay half of the bridge. Starting an indoor cycling
/// `HKWorkoutSession` is what raises the optical sensor to continuous (~1-2s)
/// heart rate sampling; each new sample is forwarded to the phone.
@MainActor
@Observable
final class HRBroadcastManager: NSObject {

    static let shared = HRBroadcastManager()

    // MARK: - Published State

    var broadcastState: BroadcastState = .idle
    var heartRate: Double = 0
    var elapsedTime: TimeInterval = 0

    /// Whether the paired iPhone is currently reachable over WatchConnectivity.
    var phoneReachable: Bool = false

    /// Whether a BLE central (the bike computer) is subscribed on the iPhone side.
    /// Relayed back from the phone via the sendMessage reply handler.
    var subscriberConnected: Bool = false

    var lastError: String?

    // MARK: - Private

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?
    private var sessionStartDate: Date?
    private var elapsedTimer: Timer?

    /// Last integer BPM sent to the phone, used to avoid sending exact duplicates.
    private var lastSentBPM: Int = 0

    // MARK: - Init

    private override init() {
        super.init()
        activateSession()
    }

    var isActive: Bool {
        broadcastState == .active || broadcastState == .starting
    }

    // MARK: - WatchConnectivity

    private func activateSession() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    // MARK: - Public API

    func start() async {
        guard broadcastState == .idle else { return }

        // watchOS allows only one active HKWorkoutSession at a time.
        if MapleWalkManager.shared.isActive {
            lastError = "End your Maple Walk before broadcasting."
            WKInterfaceDevice.current().play(.failure)
            return
        }

        lastError = nil
        broadcastState = .starting

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .cycling
        configuration.locationType = .indoor

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
            self.heartRate = 0
            self.elapsedTime = 0
            self.lastSentBPM = 0

            session.startActivity(with: Date())
            try await builder.beginCollection(at: Date())

            broadcastState = .active
            startElapsedTimer()
            WKInterfaceDevice.current().play(.start)
            print("❤️ HR broadcast started (indoor cycling)")
        } catch {
            broadcastState = .idle
            lastError = error.localizedDescription
            print("❤️ Failed to start HR broadcast: \(error)")
        }
    }

    func stop() async {
        guard isActive else {
            broadcastState = .idle
            return
        }
        broadcastState = .ending
        stopElapsedTimer()

        // Notify the phone that streaming stopped so it can drop the reported value.
        sendStopToPhone()

        // Discard the workout: end the session but never finalize it, so we don't
        // clutter Apple Health with tiny cycling entries.
        workoutSession?.end()

        workoutSession = nil
        workoutBuilder = nil
        sessionStartDate = nil
        heartRate = 0
        elapsedTime = 0
        lastSentBPM = 0
        subscriberConnected = false
        broadcastState = .idle
        WKInterfaceDevice.current().play(.stop)
        print("❤️ HR broadcast stopped")
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

    // MARK: - Metric Updates

    private func updateHeartRate() {
        guard let builder = workoutBuilder,
              let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate),
              let hrStats = builder.statistics(for: hrType),
              let mostRecent = hrStats.mostRecentQuantity() else { return }

        let hrUnit = HKUnit.count().unitDivided(by: .minute())
        let bpm = mostRecent.doubleValue(for: hrUnit)
        heartRate = bpm

        let intBPM = Int(bpm.rounded())
        guard intBPM > 0, intBPM != lastSentBPM else { return }
        lastSentBPM = intBPM
        sendHeartRateToPhone(bpm: intBPM)
    }

    private func sendHeartRateToPhone(bpm: Int) {
        let session = WCSession.default
        phoneReachable = session.isReachable

        let payload: [String: Any] = ["hr": bpm, "ts": Date().timeIntervalSince1970]

        if session.isReachable {
            session.sendMessage(payload, replyHandler: { [weak self] reply in
                Task { @MainActor [weak self] in
                    if let subscribed = reply["subscribed"] as? Bool {
                        self?.subscriberConnected = subscribed
                    }
                }
            }, errorHandler: { error in
                print("❤️ sendMessage failed: \(error.localizedDescription)")
            })
        } else {
            // Best-effort fallback so the phone still receives the latest value.
            session.transferUserInfo(payload)
        }
    }

    private func sendStopToPhone() {
        let session = WCSession.default
        let payload: [String: Any] = ["stop": true, "ts": Date().timeIntervalSince1970]
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: nil)
        } else {
            session.transferUserInfo(payload)
        }
    }
}

// MARK: - WCSessionDelegate

extension HRBroadcastManager: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        Task { @MainActor in
            self.phoneReachable = session.isReachable
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            self.phoneReachable = session.isReachable
        }
    }

    /// The phone can push its BLE subscription state up to the watch at any time.
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            if let subscribed = message["subscribed"] as? Bool {
                self.subscriberConnected = subscribed
            }
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension HRBroadcastManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        Task { @MainActor in
            if toState == .ended, self.broadcastState != .ending, self.broadcastState != .idle {
                print("❤️ HR broadcast session ended externally")
                self.stopElapsedTimer()
                self.workoutSession = nil
                self.workoutBuilder = nil
                self.heartRate = 0
                self.subscriberConnected = false
                self.sendStopToPhone()
                self.broadcastState = .idle
            }
        }
    }

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        Task { @MainActor in
            print("❤️ HR broadcast session failed: \(error)")
            self.lastError = error.localizedDescription
        }
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension HRBroadcastManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate),
              collectedTypes.contains(hrType) else { return }
        Task { @MainActor in
            self.updateHeartRate()
        }
    }
}
