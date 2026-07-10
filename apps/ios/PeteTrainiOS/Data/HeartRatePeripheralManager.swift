import Foundation
import CoreBluetooth
import Observation

/// Advertises the iPhone as a standard BLE Heart Rate sensor (Heart Rate Service 0x180D)
/// so a bike computer (e.g. Coospo CS600) pairs to it exactly like a chest strap.
///
/// Heart rate values arrive from the Apple Watch via `WatchConnectivityManager`; this
/// manager caches the latest value and re-notifies subscribed centrals at ~1Hz, which is
/// the cadence BLE heart rate straps use regardless of whether the value changed.
@MainActor
@Observable
final class HeartRatePeripheralManager: NSObject {

    static let shared = HeartRatePeripheralManager()

    // MARK: - BLE UUIDs (Bluetooth SIG assigned)

    private static let heartRateServiceUUID = CBUUID(string: "180D")
    private static let heartRateMeasurementUUID = CBUUID(string: "2A37")
    private static let bodySensorLocationUUID = CBUUID(string: "2A38")
    private static let restoreIdentifier = "com.petetrain.ios.hrPeripheral"

    private static let advertisedName = "petehome HR"

    // MARK: - Published State

    var bluetoothState: CBManagerState = .unknown
    var isAdvertising: Bool = false

    /// Number of centrals (bike computers) currently subscribed to notifications.
    var subscriberCount: Int = 0

    /// Most recent heart rate being broadcast, or nil when the watch isn't streaming.
    var currentBPM: Int?

    var isSubscribed: Bool { subscriberCount > 0 }

    /// Called whenever the subscription state changes, so the watch can be informed.
    var onSubscriptionChange: ((Bool) -> Void)?

    // MARK: - Private

    private var peripheralManager: CBPeripheralManager?
    private var hrCharacteristic: CBMutableCharacteristic?
    private var notifyTimer: Timer?

    /// Set when `updateValue` returns false (queue full); retried in `peripheralManagerIsReady`.
    private var hasPendingUpdate = false

    // MARK: - Init

    private override init() {
        super.init()
    }

    /// Create the peripheral manager and begin advertising as soon as possible.
    /// Safe to call multiple times; only initializes once.
    func start() {
        guard peripheralManager == nil else {
            startAdvertisingIfReady()
            return
        }
        peripheralManager = CBPeripheralManager(
            delegate: self,
            queue: nil,
            options: [CBPeripheralManagerOptionRestoreIdentifierKey: Self.restoreIdentifier]
        )
    }

    // MARK: - Heart Rate Input (from the watch relay)

    /// Update the cached heart rate. The 1Hz timer handles the actual BLE notify.
    func updateHeartRate(_ bpm: Int) {
        guard bpm > 0 else { return }
        currentBPM = bpm
        startNotifyTimerIfNeeded()
    }

    /// Called when the watch stops streaming; stop reporting a stale value.
    func clearHeartRate() {
        currentBPM = nil
        stopNotifyTimer()
    }

    // MARK: - Advertising

    private func startAdvertisingIfReady() {
        guard let manager = peripheralManager, manager.state == .poweredOn else { return }
        guard !manager.isAdvertising else {
            isAdvertising = true
            return
        }
        manager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [Self.heartRateServiceUUID],
            CBAdvertisementDataLocalNameKey: Self.advertisedName,
        ])
    }

    private func configureService() {
        guard let manager = peripheralManager else { return }

        // Heart Rate Measurement — notify. CoreBluetooth adds the CCCD (0x2902)
        // automatically; adding it manually would throw in add(service:).
        let hrChar = CBMutableCharacteristic(
            type: Self.heartRateMeasurementUUID,
            properties: [.notify],
            value: nil,
            permissions: [.readable]
        )

        // Body Sensor Location — read-only static value (0x02 = Wrist).
        let locationChar = CBMutableCharacteristic(
            type: Self.bodySensorLocationUUID,
            properties: [.read],
            value: Data([0x02]),
            permissions: [.readable]
        )

        let service = CBMutableService(type: Self.heartRateServiceUUID, primary: true)
        service.characteristics = [hrChar, locationChar]

        self.hrCharacteristic = hrChar
        manager.removeAllServices()
        manager.add(service)
    }

    // MARK: - Notify Timer

    private func startNotifyTimerIfNeeded() {
        guard notifyTimer == nil else { return }
        notifyTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.notifySubscribers()
            }
        }
    }

    private func stopNotifyTimer() {
        notifyTimer?.invalidate()
        notifyTimer = nil
    }

    private func notifySubscribers() {
        guard let manager = peripheralManager,
              let characteristic = hrCharacteristic,
              let bpm = currentBPM, bpm > 0,
              subscriberCount > 0 else { return }

        let data = heartRateMeasurementData(bpm: bpm)
        let sent = manager.updateValue(data, for: characteristic, onSubscribedCentrals: nil)
        hasPendingUpdate = !sent
    }

    /// Build a Heart Rate Measurement value: flags byte (0x00 = UInt8 BPM) + BPM.
    private func heartRateMeasurementData(bpm: Int) -> Data {
        let clamped = UInt8(min(max(bpm, 0), 255))
        return Data([0x00, clamped])
    }
}

// MARK: - CBPeripheralManagerDelegate

extension HeartRatePeripheralManager: CBPeripheralManagerDelegate {
    nonisolated func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        Task { @MainActor in
            self.bluetoothState = peripheral.state
            if peripheral.state == .poweredOn {
                self.configureService()
            } else {
                self.isAdvertising = false
                self.subscriberCount = 0
            }
        }
    }

    nonisolated func peripheralManager(
        _ peripheral: CBPeripheralManager,
        didAdd service: CBService,
        error: Error?
    ) {
        Task { @MainActor in
            if let error = error {
                print("❤️ Failed to add HR service: \(error.localizedDescription)")
                return
            }
            self.startAdvertisingIfReady()
        }
    }

    nonisolated func peripheralManagerDidStartAdvertising(
        _ peripheral: CBPeripheralManager,
        error: Error?
    ) {
        Task { @MainActor in
            if let error = error {
                print("❤️ Failed to start advertising: \(error.localizedDescription)")
                self.isAdvertising = false
                return
            }
            self.isAdvertising = true
            print("❤️ Advertising HR service as \(Self.advertisedName)")
        }
    }

    nonisolated func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didSubscribeTo characteristic: CBCharacteristic
    ) {
        Task { @MainActor in
            self.subscriberCount += 1
            self.startNotifyTimerIfNeeded()
            self.onSubscriptionChange?(self.isSubscribed)
            print("❤️ Central subscribed (\(self.subscriberCount))")
        }
    }

    nonisolated func peripheralManager(
        _ peripheral: CBPeripheralManager,
        central: CBCentral,
        didUnsubscribeFrom characteristic: CBCharacteristic
    ) {
        Task { @MainActor in
            self.subscriberCount = max(0, self.subscriberCount - 1)
            if self.subscriberCount == 0 {
                self.stopNotifyTimer()
            }
            self.onSubscriptionChange?(self.isSubscribed)
            print("❤️ Central unsubscribed (\(self.subscriberCount))")
        }
    }

    /// Retry a queued notification once the transmit queue has space.
    nonisolated func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
        Task { @MainActor in
            guard self.hasPendingUpdate else { return }
            self.hasPendingUpdate = false
            self.notifySubscribers()
        }
    }

    nonisolated func peripheralManager(
        _ peripheral: CBPeripheralManager,
        willRestoreState dict: [String: Any]
    ) {
        Task { @MainActor in
            self.bluetoothState = peripheral.state
            // Recover our characteristic reference from the restored services.
            if let services = dict[CBPeripheralManagerRestoredStateServicesKey] as? [CBMutableService] {
                for service in services where service.uuid == Self.heartRateServiceUUID {
                    if let restored = service.characteristics?.first(where: {
                        $0.uuid == Self.heartRateMeasurementUUID
                    }) as? CBMutableCharacteristic {
                        self.hrCharacteristic = restored
                    }
                }
            }
        }
    }
}
