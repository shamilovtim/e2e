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

final class FixtureController: UIViewController, UITableViewDataSource, UITableViewDelegate {
    let titleLabel = UILabel()
    let field = UITextField()
    let action = UIButton(type: .system)
    let landscape = UIButton(type: .system)
    let portrait = UIButton(type: .system)
    let dismiss = UIButton(type: .system)
    let duplicateA = UIButton(type: .system)
    let duplicateB = UIButton(type: .system)
    let table = UITableView(frame: .zero, style: .plain)
    let child = UIButton(type: .system)
    let result = UILabel()
    let alias = UIButton(type: .system)
    let aliasMode = UIButton(type: .system)
    let setActualText = UIButton(type: .system)
    let clearActualText = UIButton(type: .system)
    var counters: [String: Int] = [:]
    var lastGeometry = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        titleLabel.text = "Native geometry fixture"
        titleLabel.font = .boldSystemFont(ofSize: 21)
        view.addSubview(titleLabel)
        field.placeholder = "Geometry input"
        field.accessibilityIdentifier = "geometry-input"
        field.borderStyle = .roundedRect
        field.autocorrectionType = .no
        field.spellCheckingType = .no
        field.addTarget(self, action: #selector(changed), for: .editingChanged)
        field.addTarget(self, action: #selector(focusBegan), for: .editingDidBegin)
        field.addTarget(self, action: #selector(focusEnded), for: .editingDidEnd)
        view.addSubview(field)
        configure(action, "Geometry action", "geometry-action", #selector(actionTapped))
        configure(landscape, "Landscape", "landscape", #selector(toLandscape))
        configure(portrait, "Portrait", "portrait", #selector(toPortrait))
        configure(dismiss, "Hide keyboard", "hide-keyboard", #selector(hideKeyboard))
        configure(duplicateA, "Duplicate action", "duplicate-action", #selector(duplicateATapped))
        configure(duplicateB, "Duplicate action", "duplicate-action", #selector(duplicateBTapped))
        table.dataSource = self
        table.delegate = self
        table.rowHeight = 120
        table.isScrollEnabled = false
        table.separatorStyle = .none
        table.contentInsetAdjustmentBehavior = .never
        view.addSubview(table)
        result.accessibilityIdentifier = "results"
        result.numberOfLines = 0
        result.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        view.addSubview(result)
        configure(alias, "Frame alias", "geometry-alias-diagnostic", #selector(aliasTapped))
        alias.isHidden = true
        configure(aliasMode, "Enable frame alias", "setup-alias-mode", #selector(enableAlias))
        configure(setActualText, "Set actual placeholder text", "setup-set-actual-text", #selector(setPlaceholderText))
        configure(clearActualText, "Clear actual text", "setup-clear-actual-text", #selector(clearText))
        refresh()
        Events.shared.record("appReady")
    }

    func configure(_ button: UIButton, _ title: String, _ id: String, _ selector: Selector) {
        button.setTitle(title, for: .normal)
        button.accessibilityIdentifier = id
        button.backgroundColor = .secondarySystemBackground
        button.layer.cornerRadius = 6
        button.addTarget(self, action: selector, for: .touchUpInside)
        view.addSubview(button)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let w = view.bounds.width
        titleLabel.frame = CGRect(x: 24, y: 45, width: w-48, height: 30)
        field.frame = CGRect(x: 24, y: 90, width: 200, height: 42)
        action.frame = CGRect(x: 240, y: 90, width: min(220,w-264), height: 42)
        landscape.frame = CGRect(x: 24, y: 140, width: 100, height: 36)
        portrait.frame = CGRect(x: 132, y: 140, width: 100, height: 36)
        dismiss.frame = CGRect(x: 240, y: 140, width: 140, height: 36)
        table.frame = CGRect(x: 24, y: 188, width: min(350,w-48), height: 120)
        duplicateA.frame = CGRect(x: 24, y: 320, width: 166, height: 38)
        duplicateB.frame = CGRect(x: 202, y: 320, width: 166, height: 38)
        result.frame = CGRect(x: w > 500 ? 410 : 24, y: w > 500 ? 188 : 378, width: w > 500 ? w-434 : w-48, height: 95)
        // With independently observed window origin (241,224), this local frame aliases the
        // intended control's global frame. Its own live frame must still be rejected.
        alias.frame = CGRect(x: 481, y: 314, width: 220, height: 42)
        aliasMode.frame = CGRect(x: 24, y: 235, width: 350, height: 36)
        setActualText.frame = CGRect(x: 24, y: 188, width: 200, height: 36)
        clearActualText.frame = CGRect(x: 232, y: 188, width: 142, height: 36)
        let geometry = "\(view.bounds);\(view.window?.windowScene?.interfaceOrientation.rawValue ?? 0)"
        if geometry != lastGeometry {
            lastGeometry = geometry
            Events.shared.record("geometryChanged", ["viewBounds": String(describing: view.bounds), "screenBounds": String(describing: UIScreen.main.bounds), "interfaceOrientation": view.window?.windowScene?.interfaceOrientation.rawValue ?? 0, "actionScreenFrame": String(describing: action.convert(action.bounds, to: nil))])
        }
    }

    func refresh() { result.text = counters.keys.sorted().map { "\($0): \(counters[$0]!)" }.joined(separator: "\n") }
    func count(_ event: String) {
        counters[event, default: 0] += 1
        Events.shared.record(event, ["count": counters[event]!, "orientation": view.window?.windowScene?.interfaceOrientation.rawValue ?? 0])
        refresh()
    }
    @objc func actionTapped() { count("actionReceivedTap") }
    @objc func aliasTapped() { count("aliasReceivedTap") }
    @objc func enableAlias() {
        if alias.isHidden {
            alias.isHidden = false
            Events.shared.record("setupAliasPrepared", ["localFrame": String(describing: alias.frame)])
            return
        }
        alias.accessibilityIdentifier = "geometry-action"
        alias.setTitle("Geometry action", for: .normal)
        Events.shared.record("setupAliasEnabled", ["localFrame": String(describing: alias.frame)])
    }
    @objc func focusBegan() {
        Events.shared.record("inputFocusBegan", ["actualText": field.text ?? "", "length": field.text?.count ?? 0])
    }
    @objc func focusEnded() {
        Events.shared.record("inputFocusEnded", ["actualText": field.text ?? "", "length": field.text?.count ?? 0])
    }
    @objc func setPlaceholderText() {
        view.endEditing(true)
        field.text = field.placeholder
        Events.shared.record("setupSetActualText", ["actualText": field.text ?? "", "length": field.text?.count ?? 0])
        field.sendActions(for: .editingChanged)
    }
    @objc func clearText() {
        view.endEditing(true)
        field.text = ""
        Events.shared.record("setupClearActualText", ["actualText": field.text ?? "", "length": 0])
        field.sendActions(for: .editingChanged)
    }
    @objc func duplicateATapped() { count("duplicateAReceivedTap") }
    @objc func duplicateBTapped() { count("duplicateBReceivedTap") }
    @objc func changed() { Events.shared.record("inputChanged", ["text": field.text ?? ""]) }
    @objc func hideKeyboard() { view.endEditing(true); Events.shared.record("keyboardDismissRequested") }
    @objc func toLandscape() { rotate(.landscapeRight) }
    @objc func toPortrait() { rotate(.portrait) }
    func rotate(_ orientation: UIInterfaceOrientationMask) {
        view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: orientation)) { error in Events.shared.record("rotationError", ["message": error.localizedDescription]) }
        setNeedsUpdateOfSupportedInterfaceOrientations()
    }
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { 1 }
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
        cell.textLabel?.text = "Parent row"
        cell.accessibilityIdentifier = "parent-row"
        child.frame = CGRect(x: 238, y: 35, width: 100, height: 45)
        child.setTitle("Child action", for: .normal)
        child.accessibilityIdentifier = "child-action"
        child.addTarget(self, action: #selector(childTapped), for: .touchUpInside)
        cell.contentView.addSubview(child)
        return cell
    }
    @objc func childTapped() { count("childReceivedTap") }
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) { count("parentReceivedTap") }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let c = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        c.delegateClass = SceneDelegate.self
        return c
    }
}
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let w = UIWindow(windowScene: scene)
        w.rootViewController = FixtureController()
        w.makeKeyAndVisible()
        window = w
    }
}
UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
