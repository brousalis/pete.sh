import Foundation
import Security

/// Secure storage for the petehome API credentials.
///
/// One machine key covers Apple Health ingest and `/api/coach/*` bearers.
/// A build-time seed comes from `PETEHOME_API_KEY` in Info.plist (`Config.xcconfig`);
/// it is migrated into the Keychain on first read.
enum KeychainHelper {

    private static let service = "sh.pete.petehome"
    private static let apiKeyAccount = "api-key"
    private static let serverURLAccount = "server-url"

    private static let defaultServerURL = "https://www.pete.sh"

    // MARK: - API key

    /// Current API key, or an empty string when none is configured.
    static var apiKey: String {
        if let stored = read(account: apiKeyAccount), !stored.isEmpty {
            return stored
        }

        // One-time migration of the build-time seed into the Keychain.
        if let seed = infoPlistValue(for: "PETEHOME_API_KEY"), !seed.isEmpty {
            setAPIKey(seed)
            return seed
        }

        return ""
    }

    static var hasAPIKey: Bool { !apiKey.isEmpty }

    @discardableResult
    static func setAPIKey(_ key: String) -> Bool {
        write(account: apiKeyAccount, value: key)
    }

    @discardableResult
    static func clearAPIKey() -> Bool {
        delete(account: apiKeyAccount)
    }

    // MARK: - Server URL

    static var serverURL: String {
        if let stored = read(account: serverURLAccount), !stored.isEmpty {
            return stored
        }
        if let configured = infoPlistValue(for: "PETEHOME_SERVER_URL"), !configured.isEmpty {
            return configured
        }
        return defaultServerURL
    }

    @discardableResult
    static func setServerURL(_ url: String) -> Bool {
        write(account: serverURLAccount, value: url)
    }

    static func migrateServerURLIfNeeded() {
        guard let stored = read(account: serverURLAccount) else { return }
        let isLocalIP = stored.contains("192.168.") || stored.contains("10.0.") || stored.contains("localhost") || stored.contains("127.0.0.1")
        if isLocalIP {
            delete(account: serverURLAccount)
            print("[KeychainHelper] Migrated server URL from \(stored) to \(defaultServerURL)")
        }
    }

    /// Masked summary safe to show in a settings screen or log.
    static var redactedAPIKey: String {
        let key = apiKey
        guard key.count > 12 else { return key.isEmpty ? "(not set)" : "********" }
        return "\(key.prefix(6))…\(key.suffix(4))"
    }

    // MARK: - Info.plist

    private static func infoPlistValue(for key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
            return nil
        }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        // xcconfig substitution leaves the raw token behind when unset.
        if trimmed.isEmpty || trimmed.hasPrefix("$(") { return nil }
        return trimmed
    }

    // MARK: - Keychain primitives

    private static func baseQuery(account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    private static func read(account: String) -> String? {
        var query = baseQuery(account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        return value
    }

    @discardableResult
    private static func write(account: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        let query = baseQuery(account: account)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            // Available after first unlock so background sync can run without
            // the device being actively unlocked.
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return true }

        guard updateStatus == errSecItemNotFound else { return false }

        var insert = query
        insert.merge(attributes) { current, _ in current }
        return SecItemAdd(insert as CFDictionary, nil) == errSecSuccess
    }

    @discardableResult
    private static func delete(account: String) -> Bool {
        let status = SecItemDelete(baseQuery(account: account) as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
