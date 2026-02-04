import Foundation
import CoreLocation
import Observation
import WatchKit

/// Manages location-based workout automation for watchOS
/// Uses distance checking instead of region monitoring (not available on watchOS)
@MainActor
@Observable
final class LocationManager: NSObject {
    
    static let shared = LocationManager()
    
    // MARK: - State
    
    var isAuthorized = false
    var authorizationDenied = false  // Track if user explicitly denied
    var isMonitoring = false
    var isAtGym = false
    var isAtHome = false
    var currentLocation: CLLocation?
    var distanceToGym: Double?
    var distanceToHome: Double?
    var lastLocationError: String?
    
    // MARK: - Toast/Feedback State
    
    var toastMessage: String?
    var toastIcon: String?
    var showGymSaved = false
    var showHomeSaved = false
    var showGymCleared = false
    var showHomeCleared = false
    
    // MARK: - Settings (persisted)
    
    var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "locationAutoWorkoutEnabled") }
        set {
            UserDefaults.standard.set(newValue, forKey: "locationAutoWorkoutEnabled")
            if newValue && isAuthorized {
                startMonitoring()
            } else if !newValue {
                stopMonitoring()
            }
        }
    }
    
    var autoStartEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "autoStartAtGym") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "autoStartAtGym") }
    }
    
    var autoStopEnabled: Bool {
        get { UserDefaults.standard.object(forKey: "autoStopAtHome") as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: "autoStopAtHome") }
    }
    
    // MARK: - Default Locations (hardcoded)

    private static let defaultGymLatitude = 41.933616314980085
    private static let defaultGymLongitude = -87.64638745553795
    private static let defaultHomeLatitude = 41.93310114631346
    private static let defaultHomeLongitude = -87.64689042932159

    // MARK: - User-Configurable Locations (persisted)

    var gymLocation: CLLocation? {
        get {
            let lat = UserDefaults.standard.double(forKey: "gymLatitude")
            let lon = UserDefaults.standard.double(forKey: "gymLongitude")
            // Use defaults if not set (0,0 means not configured)
            if lat == 0 && lon == 0 {
                return CLLocation(latitude: Self.defaultGymLatitude, longitude: Self.defaultGymLongitude)
            }
            return CLLocation(latitude: lat, longitude: lon)
        }
        set {
            if let location = newValue {
                UserDefaults.standard.set(location.coordinate.latitude, forKey: "gymLatitude")
                UserDefaults.standard.set(location.coordinate.longitude, forKey: "gymLongitude")
            } else {
                UserDefaults.standard.removeObject(forKey: "gymLatitude")
                UserDefaults.standard.removeObject(forKey: "gymLongitude")
            }
        }
    }

    var homeLocation: CLLocation? {
        get {
            let lat = UserDefaults.standard.double(forKey: "homeLatitude")
            let lon = UserDefaults.standard.double(forKey: "homeLongitude")
            // Use defaults if not set (0,0 means not configured)
            if lat == 0 && lon == 0 {
                return CLLocation(latitude: Self.defaultHomeLatitude, longitude: Self.defaultHomeLongitude)
            }
            return CLLocation(latitude: lat, longitude: lon)
        }
        set {
            if let location = newValue {
                UserDefaults.standard.set(location.coordinate.latitude, forKey: "homeLatitude")
                UserDefaults.standard.set(location.coordinate.longitude, forKey: "homeLongitude")
            } else {
                UserDefaults.standard.removeObject(forKey: "homeLatitude")
                UserDefaults.standard.removeObject(forKey: "homeLongitude")
            }
        }
    }

    var hasGymLocationSet: Bool {
        gymLocation != nil
    }

    var hasHomeLocationSet: Bool {
        homeLocation != nil
    }

    /// Returns true if gym location is using the hardcoded default (not a custom location)
    var isUsingDefaultGymLocation: Bool {
        let lat = UserDefaults.standard.double(forKey: "gymLatitude")
        let lon = UserDefaults.standard.double(forKey: "gymLongitude")
        return lat == 0 && lon == 0
    }

    /// Returns true if home location is using the hardcoded default (not a custom location)
    var isUsingDefaultHomeLocation: Bool {
        let lat = UserDefaults.standard.double(forKey: "homeLatitude")
        let lon = UserDefaults.standard.double(forKey: "homeLongitude")
        return lat == 0 && lon == 0
    }

    /// Resets both locations to hardcoded defaults by clearing UserDefaults
    func resetToDefaultLocations() {
        UserDefaults.standard.removeObject(forKey: "gymLatitude")
        UserDefaults.standard.removeObject(forKey: "gymLongitude")
        UserDefaults.standard.removeObject(forKey: "homeLatitude")
        UserDefaults.standard.removeObject(forKey: "homeLongitude")
        print("📍 Reset to default locations")
    }

    // Thresholds in meters
    static let gymRadius: Double = 100
    static let homeRadius: Double = 50
    static nonisolated let minimumAccuracy: Double = 200  // Ignore locations less accurate than this
    
    // MARK: - Callbacks
    
    var onArriveAtGym: (() -> Void)?
    var onLeaveGymAndArriveHome: (() -> Void)?
    
    // MARK: - Private
    
    private let locationManager = CLLocationManager()
    
    // Persisted state for gym visit tracking
    private var wasAtGym: Bool {
        get { UserDefaults.standard.bool(forKey: "locationWasAtGym") }
        set { UserDefaults.standard.set(newValue, forKey: "locationWasAtGym") }
    }
    
    private var leftGymTime: Date? {
        get { UserDefaults.standard.object(forKey: "locationLeftGymTime") as? Date }
        set { UserDefaults.standard.set(newValue, forKey: "locationLeftGymTime") }
    }
    
    // Debounce tracking
    private var lastGymArrivalTime: Date?
    private var lastHomeArrivalTime: Date?
    private static let debounceInterval: TimeInterval = 60  // 1 minute debounce
    
    // Track initial location to prevent false triggers
    private var isInitialLocationUpdate = true
    private var hasProcessedInitialLocation = false
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        locationManager.distanceFilter = 50 // Update every 50 meters
        // Note: Background location on watchOS is handled via workout sessions
        
        checkAuthorization()
        
        // Clean up stale gym visit data (older than 4 hours)
        cleanupStaleState()
    }
    
    private func cleanupStaleState() {
        if let leftTime = leftGymTime,
           Date().timeIntervalSince(leftTime) > 14400 { // 4 hours
            print("📍 Cleaning up stale gym visit data")
            wasAtGym = false
            leftGymTime = nil
        }
    }
    
    // MARK: - Authorization

    func requestAuthorization() {
        // Request when-in-use first (works better on watchOS)
        locationManager.requestWhenInUseAuthorization()
    }

    /// Force recheck authorization status (call when UI needs refresh)
    func recheckAuthorization() {
        let status = locationManager.authorizationStatus
        print("📍 Rechecking authorization: \(status.rawValue) (\(statusName(for: status)))")
        updateAuthorizationState(status)
    }

    private func checkAuthorization() {
        let status = locationManager.authorizationStatus
        print("📍 Initial authorization check: \(status.rawValue) (\(statusName(for: status)))")
        updateAuthorizationState(status)
    }

    private func statusName(for status: CLAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorizedAlways: return "authorizedAlways"
        case .authorizedWhenInUse: return "authorizedWhenInUse"
        @unknown default: return "unknown"
        }
    }

    private func updateAuthorizationState(_ status: CLAuthorizationStatus) {
        let wasAuthorized = isAuthorized

        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            isAuthorized = true
            authorizationDenied = false
            print("📍 Location authorized: \(statusName(for: status))")
        case .denied, .restricted:
            isAuthorized = false
            authorizationDenied = true
            print("📍 Location denied/restricted")
        case .notDetermined:
            isAuthorized = false
            authorizationDenied = false
            print("📍 Location not determined")
        @unknown default:
            isAuthorized = false
            authorizationDenied = false
            print("📍 Location unknown status: \(status.rawValue)")
        }

        // Auto-start monitoring if just became authorized and feature is enabled
        if isAuthorized && !wasAuthorized && isEnabled && !isMonitoring {
            print("📍 Authorization granted, starting monitoring")
            startMonitoring()
        }
    }
    
    // MARK: - Monitoring
    
    func startMonitoring() {
        guard isAuthorized else {
            print("📍 Location not authorized")
            return
        }
        
        guard !isMonitoring else {
            print("📍 Already monitoring")
            return
        }
        
        // Reset initial location flag when starting fresh
        isInitialLocationUpdate = true
        hasProcessedInitialLocation = false
        
        locationManager.startUpdatingLocation()
        isMonitoring = true
        lastLocationError = nil
        print("📍 Started location monitoring")
    }
    
    func stopMonitoring() {
        guard isMonitoring else { return }
        
        locationManager.stopUpdatingLocation()
        isMonitoring = false
        print("📍 Stopped location monitoring")
    }
    
    // MARK: - Set Current Location
    
    func setCurrentAsGym() {
        guard let location = currentLocation else {
            print("📍 No current location to set as gym")
            return
        }
        gymLocation = location
        WKInterfaceDevice.current().play(.success)
        print("📍 Set gym location to: \(location.coordinate.latitude), \(location.coordinate.longitude)")
        
        // Show inline feedback
        showGymSaved = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            showGymSaved = false
        }
        
        // Recalculate distances
        updateDistances(from: location, isInitial: false)
    }
    
    func setCurrentAsHome() {
        guard let location = currentLocation else {
            print("📍 No current location to set as home")
            return
        }
        homeLocation = location
        WKInterfaceDevice.current().play(.success)
        print("📍 Set home location to: \(location.coordinate.latitude), \(location.coordinate.longitude)")
        
        // Show inline feedback
        showHomeSaved = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            showHomeSaved = false
        }
        
        // Recalculate distances
        updateDistances(from: location, isInitial: false)
    }
    
    func clearGymLocation() {
        UserDefaults.standard.removeObject(forKey: "gymLatitude")
        UserDefaults.standard.removeObject(forKey: "gymLongitude")
        WKInterfaceDevice.current().play(.click)
        print("📍 Cleared gym location")
        
        // Show inline feedback
        showGymCleared = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            showGymCleared = false
        }
    }
    
    func clearHomeLocation() {
        UserDefaults.standard.removeObject(forKey: "homeLatitude")
        UserDefaults.standard.removeObject(forKey: "homeLongitude")
        WKInterfaceDevice.current().play(.click)
        print("📍 Cleared home location")
        
        // Show inline feedback
        showHomeCleared = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            showHomeCleared = false
        }
    }
    
    // MARK: - Toast Helpers
    
    func showToast(message: String, icon: String) {
        toastMessage = message
        toastIcon = icon
        
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
            toastMessage = nil
            toastIcon = nil
        }
    }
    
    func dismissToast() {
        toastMessage = nil
        toastIcon = nil
    }
    
    // MARK: - Distance Helpers
    
    private func updateDistances(from location: CLLocation, isInitial: Bool) {
        // Calculate distances only if locations are set
        if let gym = gymLocation {
            distanceToGym = location.distance(from: gym)
        } else {
            distanceToGym = nil
        }

        if let home = homeLocation {
            distanceToHome = location.distance(from: home)
        } else {
            distanceToHome = nil
        }

        let wasAtGymBefore = isAtGym
        let wasAtHomeBefore = isAtHome

        // Check if at gym (only if gym location is set)
        isAtGym = hasGymLocationSet && (distanceToGym ?? .infinity) <= Self.gymRadius

        // Check if at home (only if home location is set)
        isAtHome = hasHomeLocationSet && (distanceToHome ?? .infinity) <= Self.homeRadius
        
        // Skip transition handling on initial location to prevent false triggers
        // BUT: Set persisted state if we're starting at a known location
        if isInitial {
            print("📍 Initial location update - skipping transitions. At gym: \(isAtGym), At home: \(isAtHome)")
            
            // If we're starting at the gym, mark that we were there
            // This ensures leaving gym → home triggers correctly
            if isAtGym {
                print("📍 Starting monitoring while at gym - marking wasAtGym")
                wasAtGym = true
            }
            return
        }
        
        // Handle state transitions
        handleLocationTransition(wasAtGym: wasAtGymBefore, wasAtHome: wasAtHomeBefore)
    }
    
    private func handleLocationTransition(wasAtGym wasAtGymBefore: Bool, wasAtHome wasAtHomeBefore: Bool) {
        // Arrived at gym
        if isAtGym && !wasAtGymBefore {
            // Debounce check
            if let lastArrival = lastGymArrivalTime,
               Date().timeIntervalSince(lastArrival) < Self.debounceInterval {
                print("📍 Gym arrival debounced")
                return
            }
            
            print("📍 ✅ ARRIVED AT GYM!")
            print("📍   Distance: \(formattedDistanceToGym)")
            print("📍   autoStartEnabled: \(autoStartEnabled)")
            wasAtGym = true
            lastGymArrivalTime = Date()
            
            if autoStartEnabled {
                WKInterfaceDevice.current().play(.notification)
                print("📍   🎬 Triggering auto-start callback")
                onArriveAtGym?()
            }
        }
        
        // Left gym
        if !isAtGym && wasAtGymBefore && wasAtGym {
            print("📍 🚶 LEFT GYM")
            print("📍   Distance: \(formattedDistanceToGym)")
            leftGymTime = Date()
        }
        
        // Arrived home after leaving gym
        if isAtHome && !wasAtHomeBefore && wasAtGym {
            print("📍 🏠 CHECKING HOME ARRIVAL")
            print("📍   wasAtGym (persisted): \(wasAtGym)")
            print("📍   leftGymTime: \(leftGymTime?.description ?? "nil")")
            print("📍   autoStopEnabled: \(autoStopEnabled)")
            
            // Debounce check
            if let lastArrival = lastHomeArrivalTime,
               Date().timeIntervalSince(lastArrival) < Self.debounceInterval {
                print("📍   ⏸️ Home arrival debounced")
                return
            }
            
            // Check if we left gym within last 2 hours
            if let leftTime = leftGymTime,
               Date().timeIntervalSince(leftTime) < 7200 { // 2 hours
                let minutesSinceLeft = Int(Date().timeIntervalSince(leftTime) / 60)
                print("📍 ✅ ARRIVED HOME AFTER GYM! (\(minutesSinceLeft) min since leaving)")
                lastHomeArrivalTime = Date()
                
                if autoStopEnabled {
                    WKInterfaceDevice.current().play(.notification)
                    print("📍   🛑 Triggering auto-stop callback")
                    onLeaveGymAndArriveHome?()
                } else {
                    print("📍   ⚠️ Auto-stop disabled, skipping callback")
                }
            } else {
                print("📍   ⚠️ No valid leftGymTime, skipping auto-stop")
            }
            
            // Reset state
            wasAtGym = false
            leftGymTime = nil
            print("📍   🔄 Reset gym session state")
        } else if isAtHome && !wasAtHomeBefore {
            // Arrived home but wasn't at gym this session
            print("📍 🏠 Arrived home (no gym visit this session)")
            print("📍   wasAtGym (persisted): \(wasAtGym)")
        }
    }
    
    // MARK: - Status
    
    var statusDescription: String {
        if authorizationDenied {
            return "Permission denied"
        }
        if !isAuthorized {
            return "Not authorized"
        }
        if !isMonitoring {
            return "Disabled"
        }
        if needsLocationSetup {
            return "Set locations below"
        }
        if let error = lastLocationError {
            return "Error: \(error)"
        }
        if isAtGym {
            return "At gym"
        }
        if isAtHome {
            return "At home"
        }
        if let distance = distanceToGym {
            if distance < 1000 {
                return "\(Int(distance))m from gym"
            }
            return String(format: "%.1fkm from gym", distance / 1000)
        }
        return "Monitoring..."
    }
    
    var needsLocationSetup: Bool {
        return !hasGymLocationSet || !hasHomeLocationSet
    }

    /// Debug helper - returns raw authorization status string
    var debugAuthStatus: String {
        let status = locationManager.authorizationStatus
        return "\(status.rawValue) (\(statusName(for: status)))"
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationManager: CLLocationManagerDelegate {
    
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            let status = manager.authorizationStatus
            updateAuthorizationState(status)
            
            if isAuthorized && isEnabled && !isMonitoring {
                startMonitoring()
            }
        }
    }
    
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        // Filter out inaccurate locations
        guard location.horizontalAccuracy >= 0,
              location.horizontalAccuracy < LocationManager.minimumAccuracy else {
            print("📍 Ignoring inaccurate location (accuracy: \(location.horizontalAccuracy)m)")
            return
        }
        
        // Filter out old locations
        let locationAge = Date().timeIntervalSince(location.timestamp)
        guard locationAge < 60 else {  // Ignore locations older than 60 seconds
            print("📍 Ignoring stale location (age: \(Int(locationAge))s)")
            return
        }
        
        Task { @MainActor in
            currentLocation = location
            lastLocationError = nil
            
            // Determine if this is the initial location update
            let isInitial = isInitialLocationUpdate && !hasProcessedInitialLocation
            if isInitial {
                hasProcessedInitialLocation = true
                isInitialLocationUpdate = false
            }
            
            updateDistances(from: location, isInitial: isInitial)
        }
    }
    
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            let errorMessage = (error as? CLError)?.localizedDescription ?? error.localizedDescription
            lastLocationError = errorMessage
            print("📍 Location error: \(errorMessage)")
        }
    }
}

// MARK: - Formatted Helpers

extension LocationManager {
    
    var formattedDistanceToGym: String {
        guard let distance = distanceToGym else { return "—" }
        if distance < 1000 {
            return "\(Int(distance))m"
        }
        return String(format: "%.1f km", distance / 1000)
    }
    
    var formattedDistanceToHome: String {
        guard let distance = distanceToHome else { return "—" }
        if distance < 1000 {
            return "\(Int(distance))m"
        }
        return String(format: "%.1f km", distance / 1000)
    }
    
    var gymLocationDescription: String {
        if let gym = gymLocation {
            return String(format: "%.4f, %.4f", gym.coordinate.latitude, gym.coordinate.longitude)
        }
        return "Not set"
    }

    var homeLocationDescription: String {
        if let home = homeLocation {
            return String(format: "%.4f, %.4f", home.coordinate.latitude, home.coordinate.longitude)
        }
        return "Not set"
    }
}
