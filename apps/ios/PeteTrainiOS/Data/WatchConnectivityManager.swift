import Foundation
import Observation
import WatchConnectivity

/// Receives live heart rate values from the PeteTrain watch app over WatchConnectivity
/// and forwards them to `HeartRatePeripheralManager` for BLE broadcast. Also relays the
/// BLE subscription state back to the watch so its UI can show "bike computer paired".
@MainActor
@Observable
final class WatchConnectivityManager: NSObject {

    static let shared = WatchConnectivityManager()

    /// Whether the paired watch is currently reachable.
    var watchReachable: Bool = false

    /// Timestamp of the last heart rate value received from the watch.
    var lastReceived: Date?

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()

        // Push subscription changes up to the watch as they happen.
        HeartRatePeripheralManager.shared.onSubscriptionChange = { [weak self] subscribed in
            self?.sendSubscriptionState(subscribed)
        }
    }

    // MARK: - Message Handling

    private func handlePayload(_ payload: [String: Any]) {
        if let stop = payload["stop"] as? Bool, stop {
            HeartRatePeripheralManager.shared.clearHeartRate()
            return
        }
        if let hr = payload["hr"] as? Int {
            lastReceived = Date()
            HeartRatePeripheralManager.shared.updateHeartRate(hr)
        }
    }

    private func sendSubscriptionState(_ subscribed: Bool) {
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else { return }
        session.sendMessage(["subscribed": subscribed], replyHandler: nil, errorHandler: nil)
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        Task { @MainActor in
            self.watchReachable = session.isReachable
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            self.watchReachable = session.isReachable
        }
    }

    /// Live values arrive here when the watch is reachable; reply with subscription state.
    nonisolated func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        Task { @MainActor in
            self.handlePayload(message)
            replyHandler(["subscribed": HeartRatePeripheralManager.shared.isSubscribed])
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            self.handlePayload(message)
        }
    }

    /// Queued fallback delivery (used when the watch sent while we weren't reachable).
    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        Task { @MainActor in
            self.handlePayload(userInfo)
        }
    }

    // iOS requires these; reactivate so the session stays usable after a watch swap.
    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}

    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}
