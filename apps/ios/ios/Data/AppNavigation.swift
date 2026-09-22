import Foundation
import Observation

/// Shared tab selection and coach WebView deep links (APNs taps).
@MainActor
@Observable
final class AppNavigation {
    static let shared = AppNavigation()

    /// Tab indices: 0 Today, 1 Sync, 2 Activity, 3 Coach
    var selectedTab = 0

    /// When set, Coach WebView loads this path then clears.
    var pendingCoachPath: String?

    func openCoach(path: String?) {
        pendingCoachPath = path
        selectedTab = 3
    }
}
