import UIKit

final class Events {
    static let shared = Events()
    let began = ProcessInfo.processInfo.systemUptime
    var rows: [[String: Any]] = []
    func record(_ event: String, _ fields: [String: Any] = [:]) {
        var row = fields
        row["event"] = event
        row["ms"] = (ProcessInfo.processInfo.systemUptime - began) * 1000
        rows.append(row)
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        if let data = try? JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted, .sortedKeys]) {
            try? data.write(to: directory.appendingPathComponent("events.json"))
        }
    }
}

final class OtherControl: UIControl {
    let text = UILabel()
    let row: Int
    var volatileValue = false
    var onPress: ((Int) -> Void)?
    override var accessibilityValue: String? {
        get {
            if volatileValue { return String(format: "value-%.9f", ProcessInfo.processInfo.systemUptime) }
            return super.accessibilityValue
        }
        set { super.accessibilityValue = newValue }
    }
    init(row: Int) {
        self.row = row
        super.init(frame: CGRect(x: 0, y: row * 42, width: 345, height: 40))
        isAccessibilityElement = true
        accessibilityTraits = []
        backgroundColor = .systemTeal.withAlphaComponent(0.15)
        text.isAccessibilityElement = false
        text.font = .systemFont(ofSize: 13)
        addSubview(text)
        addTarget(self, action: #selector(received), for: .touchUpInside)
    }
    required init?(coder: NSCoder) { fatalError() }
    override func layoutSubviews() {
        super.layoutSubviews()
        text.frame = bounds.insetBy(dx: 8, dy: 3)
    }
    @objc func received() { onPress?(row) }
}

final class FixtureController: UIViewController {
    let titleLabel = UILabel(), instruction = UILabel(), result = UILabel()
    let list = UIScrollView()
    var buttons: [UIButton] = []
    var controls: [OtherControl] = []
    var mode = "anonymous"
    var targetTaps = 0, otherTaps = 0
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        titleLabel.text = "Readiness identity variants"
        titleLabel.font = .boldSystemFont(ofSize: 20)
        view.addSubview(titleLabel)
        instruction.text = "Target is the first row. Controls: 500."
        instruction.font = .systemFont(ofSize: 13)
        view.addSubview(instruction)
        addButton("Anon Other", "mode-anonymous", #selector(showAnonymous))
        addButton("Anon Button", "mode-buttons", #selector(showButtons))
        addButton("Shared ID", "mode-shared", #selector(showShared))
        addButton("Missing binding", "mode-missing", #selector(showMissing))
        list.clipsToBounds = true
        list.contentInsetAdjustmentBehavior = .never
        view.addSubview(list)
        for row in 0..<500 {
            let control = OtherControl(row: row)
            control.onPress = { [weak self] index in self?.received(index) }
            controls.append(control)
            list.addSubview(control)
        }
        result.accessibilityIdentifier = "results"
        result.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        result.numberOfLines = 0
        view.addSubview(result)
        setMode("anonymous")
        Events.shared.record("appReady", ["otherControlCount": 500, "variant": mode])
    }
    func addButton(_ title: String, _ identifier: String, _ action: Selector) {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.accessibilityIdentifier = identifier
        button.backgroundColor = .secondarySystemBackground
        button.addTarget(self, action: action, for: .touchUpInside)
        buttons.append(button)
        view.addSubview(button)
    }
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let width = view.bounds.width
        titleLabel.frame = CGRect(x: 24, y: 55, width: width - 48, height: 28)
        instruction.frame = CGRect(x: 24, y: 88, width: width - 48, height: 24)
        for (index, button) in buttons.enumerated() {
            button.frame = CGRect(x: 24 + (index % 2) * 179, y: 118 + (index / 2) * 42, width: 166, height: 36)
        }
        list.frame = CGRect(x: 24, y: 220, width: width - 48, height: 220)
        list.contentSize = CGSize(width: list.bounds.width, height: 500 * 42)
        for control in controls { control.frame.size.width = list.bounds.width }
        result.frame = CGRect(x: 24, y: 465, width: width - 48, height: 110)
    }
    func setMode(_ next: String) {
        mode = next
        targetTaps = 0
        otherTaps = 0
        for control in controls {
            control.volatileValue = next == "missing" && control.row == 0
            control.accessibilityValue = next == "anonymous" ? "Shared icon value" : nil
            control.accessibilityTraits = next == "buttons" ? .button : []
            if next == "anonymous" || next == "buttons" {
                control.accessibilityIdentifier = nil
                control.accessibilityLabel = nil
                control.text.text = nil
            } else if next == "shared" {
                control.accessibilityIdentifier = "shared-row"
                control.accessibilityLabel = String(format: "Shared row %03d", control.row)
                control.text.text = control.accessibilityLabel
            } else {
                control.accessibilityIdentifier = control.row == 0 ? "missing-target" : String(format: "other-%03d", control.row)
                control.accessibilityLabel = control.row == 0 ? "Volatile value target" : String(format: "Other row %03d", control.row)
                control.text.text = control.accessibilityLabel
            }
        }
        list.contentOffset = .zero
        updateResult()
        Events.shared.record("modeChanged", ["variant": mode, "otherControlCount": controls.count])
    }
    func updateResult() {
        result.text = "Variant: \(mode)\nTarget taps: \(targetTaps)\nOther taps: \(otherTaps)"
    }
    func received(_ index: Int) {
        if index == 0 { targetTaps += 1 } else { otherTaps += 1 }
        Events.shared.record("controlReceivedTap", ["row": index, "variant": mode, "targetTaps": targetTaps, "otherTaps": otherTaps])
        updateResult()
    }
    @objc func showAnonymous() { setMode("anonymous") }
    @objc func showButtons() { setMode("buttons") }
    @objc func showShared() { setMode("shared") }
    @objc func showMissing() { setMode("missing") }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default", sessionRole: session.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = FixtureController()
        window.makeKeyAndVisible()
        self.window = window
    }
}
UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
