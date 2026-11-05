import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    guard let scene = scene as? UIWindowScene else { return }
    let window = UIWindow(windowScene: scene)
    window.rootViewController = ScrollController()
    window.makeKeyAndVisible()
    self.window = window
  }
}

final class ScrollController: UIViewController, UIScrollViewDelegate {
  private let status = UILabel()
  private let scroll = UIScrollView()
  private var composerTouches = 0

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .white
    let notes = UITextField()
    notes.placeholder = "Notes"
    notes.accessibilityLabel = "Notes"
    notes.accessibilityIdentifier = "notes"
    notes.borderStyle = .roundedRect
    notes.autocorrectionType = .no
    let composer = UIButton(type: .system)
    composer.setTitle("Composer", for: .normal)
    composer.backgroundColor = .systemYellow
    composer.accessibilityIdentifier = "composer"
    composer.addTarget(self, action: #selector(touchedComposer), for: .touchDown)
    status.accessibilityIdentifier = "scroll-status"
    status.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
    status.textColor = .black
    let rows = UIStackView()
    rows.axis = .vertical
    for index in 0..<40 {
      let label = UILabel()
      label.text = "Row \(index)"
      label.textColor = .black
      label.accessibilityIdentifier = "row-\(index)"
      label.heightAnchor.constraint(equalToConstant: 80).isActive = true
      rows.addArrangedSubview(label)
    }
    scroll.delegate = self
    scroll.keyboardDismissMode = .none
    scroll.contentInsetAdjustmentBehavior = .never
    scroll.accessibilityIdentifier = "rows"
    scroll.addSubview(rows)
    for child in [status, notes, scroll, composer] { child.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(child) }
    rows.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      status.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
      status.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      status.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      status.heightAnchor.constraint(equalToConstant: 24),
      notes.topAnchor.constraint(equalTo: status.bottomAnchor, constant: 8),
      notes.leadingAnchor.constraint(equalTo: status.leadingAnchor), notes.trailingAnchor.constraint(equalTo: status.trailingAnchor),
      notes.heightAnchor.constraint(equalToConstant: 44),
      scroll.topAnchor.constraint(equalTo: notes.bottomAnchor, constant: 8),
      scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor), scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scroll.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
      rows.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor), rows.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
      rows.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor), rows.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
      rows.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor),
      composer.leadingAnchor.constraint(equalTo: view.leadingAnchor), composer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      composer.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor), composer.heightAnchor.constraint(equalToConstant: 64),
    ])
    updateStatus()
  }
  @objc private func touchedComposer() { composerTouches += 1; updateStatus() }
  func scrollViewDidScroll(_ scrollView: UIScrollView) { updateStatus() }
  private func updateStatus() { status.text = "Offset \(Int(scroll.contentOffset.y)); composer touches \(composerTouches)" }
}
