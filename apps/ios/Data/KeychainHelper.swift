import Foundation
import Security

/// Helper for securely storing sensitive data in the iOS Keychain
/// Used primarily for storing the Petehome API key
enum KeychainHelper {
    
    // MARK: - Hardcoded Configuration (no keychain needed)

    /// API key for Petehome sync
    static let apiKey: String = "6PsAdgrT3eOZ2wtXlUCDGoxEnKvWFRhkY8Jfq4QN7a19cLBp"

    /// Server URL for Petehome API
    static let serverURL: String = "https://www.pete.sh"

    /// Always configured
    static var hasAPIKey: Bool { true }
}
