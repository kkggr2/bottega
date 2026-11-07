import Capacitor
import WidgetKit

/// The app's main screen. Same as Capacitor's, plus the plugin that feeds the home-screen widget.
class BottegaViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
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
