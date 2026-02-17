import SwiftUI
import WebKit

extension Notification.Name {
    static let fridgeScanCompleted = Notification.Name("fridgeScanCompleted")
}

/// WKWebView wrapper for displaying pete.sh
struct PetehomeWebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    var onOpenSyncSheet: (() -> Void)?
    var onOpenFridgeScanner: (() -> Void)?
    var onRefresh: (() -> Void)?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        // Enable native bridge for web-to-native calls
        let userController = WKUserContentController()
        userController.add(context.coordinator, name: "petehome")
        config.userContentController = userController

        // Allow background audio/video playback
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator

        // Enable pull-to-refresh
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl

        // Allow bounce scrolling
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true

        // Enable back/forward navigation gestures
        webView.allowsBackForwardNavigationGestures = true

        // Set background color to match pete.sh
        webView.backgroundColor = UIColor.black
        webView.scrollView.backgroundColor = UIColor.black
        webView.isOpaque = false

        // Load the URL
        let request = URLRequest(url: url)
        webView.load(request)

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Update coordinator callbacks
        context.coordinator.onOpenSyncSheet = onOpenSyncSheet
        context.coordinator.onOpenFridgeScanner = onOpenFridgeScanner
        context.coordinator.webView = webView
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: PetehomeWebView
        var onOpenSyncSheet: (() -> Void)?
        var onOpenFridgeScanner: (() -> Void)?
        weak var webView: WKWebView?

        init(_ parent: PetehomeWebView) {
            self.parent = parent
            self.onOpenSyncSheet = parent.onOpenSyncSheet
            self.onOpenFridgeScanner = parent.onOpenFridgeScanner
            super.init()

            // Observe fridge scan completion notifications from native scanner sheet
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleFridgeScanNotification(_:)),
                name: .fridgeScanCompleted,
                object: nil
            )
        }

        deinit {
            NotificationCenter.default.removeObserver(self, name: .fridgeScanCompleted, object: nil)
        }

        @objc private func handleFridgeScanNotification(_ notification: Notification) {
            guard let userInfo = notification.userInfo,
                  let items = userInfo["items"] as? [String],
                  let scanId = userInfo["scanId"] as? String else { return }
            Task { @MainActor in
                self.sendFridgeScanResults(items: items, scanId: scanId)
            }
        }

        /// Send fridge scan results back to the WebView
        func sendFridgeScanResults(items: [String], scanId: String) {
            guard let webView = webView else { return }
            let itemsJson = (try? JSONSerialization.data(withJSONObject: items))
                .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
            let js = "window.__onFridgeScanComplete && window.__onFridgeScanComplete({items: \(itemsJson), scanId: \"\(scanId)\"})"
            webView.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("[JS Bridge] Error sending fridge scan results: \(error)")
                }
            }
        }

        // MARK: - Pull to Refresh

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            parent.onRefresh?()
            sender.endRefreshing()

            // Also reload the web view
            if let webView = sender.superview?.superview as? WKWebView {
                webView.reload()
            }
        }

        // MARK: - WKNavigationDelegate

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            Task { @MainActor in
                self.parent.isLoading = true
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            Task { @MainActor in
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            Task { @MainActor in
                self.parent.isLoading = false
            }
            print("WebView navigation failed: \(error.localizedDescription)")
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            Task { @MainActor in
                self.parent.isLoading = false
            }
            print("WebView provisional navigation failed: \(error.localizedDescription)")
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Allow pete.sh URLs to load in the WebView
            if url.host?.contains("pete.sh") == true {
                decisionHandler(.allow)
                return
            }

            // Open external links in Safari
            if navigationAction.navigationType == .linkActivated {
                if url.scheme == "http" || url.scheme == "https" {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }
            }

            decisionHandler(.allow)
        }

        // MARK: - WKUIDelegate

        // Handle new window requests (target="_blank")
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            // Load the URL in the current webView instead of creating a new window
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }

        // Handle JavaScript alerts
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            print("JavaScript alert: \(message)")
            completionHandler()
        }

        // Handle JavaScript confirms
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            print("JavaScript confirm: \(message)")
            completionHandler(true)
        }

        // MARK: - WKScriptMessageHandler (JS Bridge)

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            // Handle messages from JavaScript
            // Web can call: window.webkit.messageHandlers.petehome.postMessage({ action: "openSyncSheet" })

            guard message.name == "petehome" else { return }
            guard let body = message.body as? [String: Any] else {
                print("Invalid message body from JS")
                return
            }

            guard let action = body["action"] as? String else {
                print("Missing action in JS message")
                return
            }

            print("JS bridge received action: \(action)")

            Task { @MainActor in
                await handleJSBridgeAction(action, body: body)
            }
        }

        @MainActor
        private func handleJSBridgeAction(_ action: String, body: [String: Any]) async {
            let syncManager = HealthKitSyncManager.shared

            switch action {
            case "openSyncSheet":
                // Open the native sync sheet
                onOpenSyncSheet?()

            case "openFridgeScanner":
                // Open the native fridge scanner sheet
                onOpenFridgeScanner?()

            case "syncNow":
                // Trigger a sync from the web
                _ = await syncManager.syncRecent()

            case "syncAll":
                // Sync all history
                _ = await syncManager.syncAllHistory()

            case "testConnection":
                // Test API connection
                _ = await syncManager.testConnection()

            case "getHealthKitStatus":
                // Return HealthKit authorization status
                print("HealthKit authorized: \(syncManager.isAuthorized)")

            default:
                print("Unknown JS bridge action: \(action)")
            }
        }
    }
}

// MARK: - Preview

#Preview {
    PetehomeWebView(
        url: URL(string: "https://pete.sh")!,
        isLoading: .constant(false)
    )
}
