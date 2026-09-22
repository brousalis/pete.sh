import SwiftUI
import WebKit

/// WKWebView wrapper for the local coach PWA.
struct PetehomeWebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var pendingNavigationURL: URL?
    var onRefresh: (() -> Void)?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        let userController = WKUserContentController()
        userController.add(context.coordinator, name: "petehome")
        config.userContentController = userController
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl
        webView.scrollView.bounces = true
        webView.allowsBackForwardNavigationGestures = true
        webView.backgroundColor = UIColor.black
        webView.scrollView.backgroundColor = UIColor.black
        webView.isOpaque = false

        webView.load(URLRequest(url: url))
        context.coordinator.lastLoadedURL = url

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onRefresh = onRefresh

        if let pending = pendingNavigationURL {
            pendingNavigationURL = nil
            webView.load(URLRequest(url: pending))
            context.coordinator.lastLoadedURL = pending
            return
        }

        if context.coordinator.lastLoadedURL != url {
            webView.load(URLRequest(url: url))
            context.coordinator.lastLoadedURL = url
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: PetehomeWebView
        var onRefresh: (() -> Void)?
        weak var webView: WKWebView?
        var lastLoadedURL: URL?

        init(_ parent: PetehomeWebView) {
            self.parent = parent
            self.onRefresh = parent.onRefresh
            super.init()
        }

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            onRefresh?()
            sender.endRefreshing()
            if let webView = sender.superview?.superview as? WKWebView {
                webView.reload()
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            self.webView = webView
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

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let targetURL = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if isCoachHost(targetURL) {
                decisionHandler(.allow)
                return
            }

            if navigationAction.navigationType == .linkActivated,
               targetURL.scheme == "http" || targetURL.scheme == "https" {
                UIApplication.shared.open(targetURL)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
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

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "petehome",
                  let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }

            Task { @MainActor in
                switch action {
                case "syncNow":
                    _ = await HealthKitSyncManager.shared.syncRecent()
                case "syncAll":
                    _ = await HealthKitSyncManager.shared.syncAllHistory()
                case "testConnection":
                    _ = await HealthKitSyncManager.shared.testConnection()
                default:
                    break
                }
            }
        }

        private func isCoachHost(_ url: URL) -> Bool {
            guard let host = url.host?.lowercased() else { return false }
            let configured = URL(string: KeychainHelper.serverURL)?.host?.lowercased()
            if host == configured { return true }
            if host.contains("pete.sh") { return true }
            if host.hasSuffix(".local") { return true }
            if host == "localhost" || host.hasPrefix("192.168.") { return true }
            return false
        }
    }
}

#Preview {
    PetehomeWebView(
        url: CoachURLBuilder.coachDeskURL(),
        isLoading: .constant(false),
        pendingNavigationURL: .constant(nil)
    )
}
