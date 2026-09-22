import Foundation

/// Health check against the configured petehome server (`GET /api/health`).
final class LocalServerChecker: NSObject, URLSessionDelegate {
    func check(baseURL: URL) async -> Bool {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 3
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        defer { session.invalidateAndCancel() }

        let healthURL = baseURL.appendingPathComponent("api/health")

        do {
            let (data, response) = try await session.data(from: healthURL)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return false }
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
            if json["ok"] as? Bool == true { return true }
            if json["service"] as? String == "petehome" { return true }
            return json["instanceId"] as? String == "petehome-local"
        } catch {
            print("[LocalServerChecker] Health check failed: \(error.localizedDescription)")
            return false
        }
    }

    /// Trust `.local` TLS certificates (mkcert dev certs installed on device).
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           challenge.protectionSpace.host.hasSuffix(".local"),
           let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}

enum CoachURLBuilder {
    static func serverBaseURL() -> URL {
        URL(string: KeychainHelper.serverURL) ?? URL(string: "https://www.pete.sh")!
    }

    static func coachDeskURL() -> URL {
        serverBaseURL().appendingPathComponent("coach")
    }

    /// Resolve a push deep-link path (e.g. `/coach?panel=today`) against the configured server.
    static func url(forPath path: String?) -> URL {
        let base = serverBaseURL()
        guard let path, !path.isEmpty else {
            return coachDeskURL()
        }
        if let absolute = URL(string: path), absolute.scheme != nil {
            return absolute
        }
        let normalized = path.hasPrefix("/") ? path : "/\(path)"
        return URL(string: normalized, relativeTo: base) ?? coachDeskURL()
    }
}
