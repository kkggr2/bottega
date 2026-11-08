import Capacitor
import UIKit
import WidgetKit

/// The app's main screen. Same as Capacitor's, plus the plugin that feeds the home-screen widget.
class BottegaViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        // Swipe in from the left edge to go back, like any iPhone app.
        webView?.allowsBackForwardNavigationGestures = true
        applyTextSize()
        NotificationCenter.default.addObserver(
            self, selector: #selector(applyTextSize),
            name: UIContentSizeCategory.didChangeNotification, object: nil)
    }

    /// Follows Settings → Display & Brightness → Text Size (and the larger Accessibility sizes),
    /// scaling the whole page so nothing overlaps.
    @objc func applyTextSize() {
        let zoom: CGFloat
        switch traitCollection.preferredContentSizeCategory {
        case .extraLarge: zoom = 1.08
        case .extraExtraLarge: zoom = 1.16
        case .extraExtraExtraLarge: zoom = 1.24
        case .accessibilityMedium: zoom = 1.32
        case .accessibilityLarge: zoom = 1.42
        case .accessibilityExtraLarge: zoom = 1.52
        case .accessibilityExtraExtraLarge, .accessibilityExtraExtraExtraLarge: zoom = 1.62
        default: zoom = 1.0
        }
        webView?.pageZoom = zoom
    }
}

/// Saves what friends have on right now where the widget can read it, then asks the widget to redraw.
/// Called from the web code as `WidgetBridge.save({ json })` (see src/lib/widget.ts).
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.com.kkggr2.bottega"
    static let key = "friendsNow"

    @objc func save(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Missing json")
            return
        }
        // Widgets can't load images from the internet, so fetch friends' covers here first,
        // save small copies in the shared folder, and note each file name in the snapshot.
        Self.withLocalCovers(json) { enriched in
            UserDefaults(suiteName: Self.appGroup)?.set(enriched, forKey: Self.key)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        }
    }

    static func coversFolder() -> URL? {
        guard let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
        let dir = base.appendingPathComponent("widget-covers", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// A stable file name for a cover address.
    static func fileName(for url: String) -> String {
        var hash: UInt64 = 1469598103934665603
        for byte in url.utf8 { hash = (hash ^ UInt64(byte)) &* 1099511628211 }
        return String(hash, radix: 16) + ".jpg"
    }

    static func withLocalCovers(_ json: String, done: @escaping (String) -> Void) {
        guard let data = json.data(using: .utf8),
              var snapshot = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              var friends = snapshot["friends"] as? [[String: Any]],
              let dir = coversFolder() else { return done(json) }

        let group = DispatchGroup()
        var keep = Set<String>()
        for i in friends.indices {
            guard let cover = friends[i]["cover"] as? String, cover.hasPrefix("https://"), let url = URL(string: cover) else { continue }
            let name = fileName(for: cover)
            let file = dir.appendingPathComponent(name)
            friends[i]["image"] = name
            keep.insert(name)
            if FileManager.default.fileExists(atPath: file.path) { continue }
            group.enter()
            URLSession.shared.dataTask(with: url) { data, _, _ in
                defer { group.leave() }
                guard let data, let image = UIImage(data: data) else { return }
                // Small copies: widgets have a tight memory budget.
                let side: CGFloat = 360
                let scale = min(1, side / max(image.size.width, image.size.height))
                let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                let small = UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
                try? small.jpegData(compressionQuality: 0.8)?.write(to: file)
            }.resume()
        }

        group.notify(queue: .main) {
            // Forget covers that are no longer on anyone's turntable.
            if let old = try? FileManager.default.contentsOfDirectory(atPath: dir.path) {
                for name in old where !keep.contains(name) { try? FileManager.default.removeItem(at: dir.appendingPathComponent(name)) }
            }
            snapshot["friends"] = friends
            if let out = try? JSONSerialization.data(withJSONObject: snapshot), let text = String(data: out, encoding: .utf8) {
                done(text)
            } else {
                done(json)
            }
        }
    }
}
