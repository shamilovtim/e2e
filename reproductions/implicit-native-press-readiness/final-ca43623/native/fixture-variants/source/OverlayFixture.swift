import UIKit

// Real UIKit animation/hit testing; counters only record delivered events.
final class EventLog {
    static let shared = EventLog()
    private let began = ProcessInfo.processInfo.systemUptime
    private(set) var rows: [[String: Any]] = []
    func record(_ event: String, _ fields: [String: Any] = [:]) {
        var row = fields
        row["event"] = event
        row["ms"] = (ProcessInfo.processInfo.systemUptime - began) * 1000
        rows.append(row)
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let data = try? JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted, .sortedKeys])
        try? data?.write(to: directory.appendingPathComponent("events-\(ProcessInfo.processInfo.processIdentifier).json"))
        try? data?.write(to: directory.appendingPathComponent("events.json"))
    }
}

final class Overlay: UIView {
    var receivedTouch: (() -> Void)?
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        EventLog.shared.record("overlayReceivedTouch")
        receivedTouch?()
        super.touchesBegan(touches, with: event)
    }
}

final class FixtureController: UIViewController {
    let result = UILabel()
    var underlyingCount = 0
    var overlayCount = 0
    var overlay: Overlay?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        title = "Overlay transition proof"
        let title = UILabel(frame: CGRect(x: 24, y: 80, width: 340, height: 40))
        title.text = "Overlay transition proof"
        title.font = .boldSystemFont(ofSize: 24)
        view.addSubview(title)
        addButton("Open fade overlay", y: 140, selector: #selector(openFade))
        addButton("Open slow fade overlay", y: 200, selector: #selector(openSlowFade))
        addButton("Open native sheet", y: 260, selector: #selector(openSheet))
        addButton("Duplicate action", y: 360, selector: #selector(decoy)).accessibilityIdentifier = "duplicate"
        addButton("Duplicate action", y: 430, selector: #selector(underlying)).accessibilityIdentifier = "duplicate"
        let anonymous = addButton("", y: 580, selector: #selector(underlying))
        anonymous.accessibilityIdentifier = nil
        anonymous.accessibilityLabel = nil
        anonymous.isAccessibilityElement = true
        addButton("Overlapping action", y: 650, selector: #selector(underlying)).accessibilityIdentifier = "overlap"
        addButton("Overlapping action", y: 650, selector: #selector(decoy)).accessibilityIdentifier = "overlap"
        result.frame = CGRect(x: 24, y: 730, width: 340, height: 100)
        result.numberOfLines = 0
        view.addSubview(result)
        refresh()
        EventLog.shared.record("appReady")
    }
    @discardableResult
    func addButton(_ name: String, y: CGFloat, selector: Selector, parent: UIView? = nil) -> UIButton {
        let button = UIButton(type: .system)
        button.frame = CGRect(x: 24, y: y, width: 340, height: 48)
        button.setTitle(name, for: .normal)
        button.accessibilityIdentifier = name
        button.backgroundColor = .secondarySystemBackground
        button.layer.cornerRadius = 8
        button.addTarget(self, action: selector, for: .touchUpInside)
        (parent ?? view).addSubview(button)
        return button
    }
    func refresh() {
        result.text = "Underlying taps: \(underlyingCount)\nOverlay touches: \(overlayCount)"
        result.accessibilityIdentifier = "results"
    }
    @objc func underlying() {
        underlyingCount += 1
        EventLog.shared.record("underlyingReceivedTap", ["count": underlyingCount])
        refresh()
    }
    @objc func decoy() { EventLog.shared.record("decoyReceivedTap") }
    @objc func openFade() { presentFade(duration: 0.75) }
    @objc func openSlowFade() { presentFade(duration: 3) }
    func presentFade(duration: Double) {
        let cover = Overlay(frame: view.bounds)
        cover.accessibilityViewIsModal = false
        cover.receivedTouch = { [weak self] in self?.overlayCount += 1; self?.refresh() }
        let backdrop = UIView(frame: cover.bounds)
        backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.25)
        backdrop.isUserInteractionEnabled = false
        cover.addSubview(backdrop)
        let panel = UIView(frame: CGRect(x: 12, y: 310, width: view.bounds.width - 24, height: 260))
        panel.backgroundColor = .systemOrange
        cover.addSubview(panel)
        let label = UILabel(frame: CGRect(x: 12, y: 15, width: 340, height: 55))
        label.text = "Fade duration: \(duration) s"
        panel.addSubview(label)
        let close = UIButton(type: .system)
        close.frame = CGRect(x: 12, y: 180, width: 340, height: 48)
        close.setTitle("Close overlay", for: .normal)
        close.accessibilityIdentifier = "Close overlay"
        close.backgroundColor = .systemBackground
        close.addAction(UIAction { [weak self, weak cover] _ in
            guard let cover else { return }
            EventLog.shared.record("fadeDismissBegin", ["durationMs": duration * 1000])
            UIView.animate(withDuration: duration, delay: 0, options: [.allowUserInteraction, .curveEaseInOut], animations: {
                panel.alpha = 0
                backdrop.alpha = 0
            }, completion: { _ in
                cover.removeFromSuperview()
                self?.overlay = nil
                EventLog.shared.record("fadeDismissComplete")
            })
        }, for: .touchUpInside)
        panel.addSubview(close)
        overlay = cover
        view.addSubview(cover)
        EventLog.shared.record("fadeOverlayOpened", ["durationMs": duration * 1000])
    }
    @objc func openSheet() {
        let sheet = UIViewController()
        sheet.view.backgroundColor = .systemOrange
        sheet.modalPresentationStyle = .pageSheet
        let button = UIButton(type: .system)
        button.frame = CGRect(x: 24, y: 110, width: 340, height: 48)
        button.setTitle("Close sheet", for: .normal)
        button.addAction(UIAction { _ in
            EventLog.shared.record("sheetDismissBegin")
            sheet.dismiss(animated: true) { EventLog.shared.record("sheetDismissComplete") }
        }, for: .touchUpInside)
        sheet.view.addSubview(button)
        present(sheet, animated: true) { EventLog.shared.record("sheetOpened") }
    }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = FixtureController()
        window.makeKeyAndVisible()
        self.window = window
    }
}

UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
