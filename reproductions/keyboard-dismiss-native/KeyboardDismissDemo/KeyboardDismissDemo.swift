import SwiftUI

@main
struct KeyboardDismissDemo: App {
    var body: some Scene {
        WindowGroup { KeyboardForm() }
    }
}

struct KeyboardForm: View {
    @State private var notes = ""
    @State private var selected = false
    @State private var changes = 0
    @FocusState private var editing: Bool

    var body: some View {
        VStack(spacing: 24) {
            Text("Keyboard dismissal proof").font(.title2)
            Text("Option changes: \(changes)").accessibilityIdentifier("changes")
            Toggle("Form option", isOn: $selected)
                .accessibilityIdentifier("option")
                .onChange(of: selected) { changes += 1 }
            Text(selected ? "Option: on" : "Option: off").accessibilityIdentifier("option-state")
            TextField("Notes", text: $notes)
                .textFieldStyle(.roundedBorder)
                .focused($editing)
                .accessibilityIdentifier("notes")
            Button("Hide keyboard") { editing = false }
                .accessibilityIdentifier("hide-keyboard")
            Button("Reset form") {
                selected = false
                changes = 0
                notes = ""
                editing = false
            }.accessibilityIdentifier("reset")
            Spacer()
        }
        .padding(24)
    }
}
