import SwiftUI

/// WebView tab — loads pete.sh with JS bridge for native sheets
struct WebViewTab: View {
    @State private var isLoading = true
    @State private var showSyncSheet = false
    @State private var showFridgeScanner = false
    @State private var resolvedURL: URL?

    /// Remote (production) URL
    private let remoteURL = URL(string: "https://pete.sh")!
    /// Local dev server URL
    private let localURL = URL(string: "https://boufos.local:3000")!

    /// The URL the WebView should load (local if available, else remote)
    private var webViewURL: URL { resolvedURL ?? remoteURL }

    var body: some View {
        ZStack {
            // Full-screen WebView
            PetehomeWebView(
                url: webViewURL,
                isLoading: $isLoading,
                onOpenSyncSheet: {
                    showSyncSheet = true
                },
                onOpenFridgeScanner: {
                    showFridgeScanner = true
                },
                onRefresh: { }
            )
            .ignoresSafeArea()

            // Loading overlay
            if isLoading {
                ZStack {
                    Color.black.opacity(0.8)
                        .ignoresSafeArea()

                    VStack(spacing: 16) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)

                        Text(resolvedURL == nil ? "Connecting..." : "Loading petehome...")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
            }
        }
        .sheet(isPresented: $showSyncSheet) {
            SyncSheetView(syncManager: HealthKitSyncManager.shared)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showFridgeScanner) {
            FridgeScannerSheet(
                scanManager: FridgeScanManager.shared,
                onScanComplete: { items, scanId in
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        NotificationCenter.default.post(
                            name: .fridgeScanCompleted,
                            object: nil,
                            userInfo: ["items": items, "scanId": scanId]
                        )
                    }
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .task {
            resolvedURL = await checkLocalServer() ? localURL : remoteURL
        }
    }

    /// Check if the local dev server is reachable via native URLSession
    private func checkLocalServer() async -> Bool {
        let checker = LocalServerChecker()
        let isAvailable = await checker.check(url: localURL)
        print("[WebViewTab] Local server check: \(isAvailable ? "available" : "unavailable")")
        return isAvailable
    }
}

// MARK: - Local Server Checker

/// Performs a native URLSession health check against the local server,
/// trusting .local certificates so WKWebView can load the local URL directly.
private class LocalServerChecker: NSObject, URLSessionDelegate {
    func check(url: URL) async -> Bool {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 3
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        defer { session.invalidateAndCancel() }

        do {
            let healthURL = url.appendingPathComponent("api/health")
            let (data, response) = try await session.data(from: healthURL)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return false }
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
            return json["instanceId"] as? String == "petehome-local"
        } catch {
            print("[LocalServerChecker] Health check failed: \(error.localizedDescription)")
            return false
        }
    }

    /// Trust .local TLS certificates (mkcert dev certs installed on device)
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

#Preview {
    WebViewTab()
}
