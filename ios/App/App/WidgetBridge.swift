import Capacitor
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
        UserDefaults(suiteName: Self.appGroup)?.set(json, forKey: Self.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
