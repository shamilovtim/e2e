# Native keyboard dismissal check

This SwiftUI fixture checks the real, unmodified agent-device SDK. It does not
inject keyboard metadata or change form state when a keyboard command is sent.
The form has a text field, a native switch, an option-change counter, and an
app-owned Hide keyboard button. No network, credentials, or model is used.

## Observed result

On 2026-11-05, agent-device 0.21.36, iPhone 15 Pro, iOS 27.0 Simulator:

| Case | Observed result |
| --- | --- |
| Three calls with the keyboard hidden | All returned `wasVisible: false`, `dismissed: false`, `visible: false`. Form unchanged. |
| Three immediate focus/dismiss calls | All refused with `UNSUPPORTED_OPERATION` because the iPhone keyboard exposed no dismiss key. Form unchanged. |
| Three app-hide/dismiss calls | All reported the keyboard already hidden. Form unchanged. |
| Positive control: press the native switch thumb | Option changed from off to on and the counter changed from 0 to 1. |

The [recorded results](evidence/results-summary.json), retained raw capture
samples, and screenshots are under [evidence/](evidence/). A video is attached to
[issue #1560](https://github.com/tester-army/e2e/issues/1560).

The initial native captures reported healthy absent/visible keyboard facts with
an on-screen visible frame. Later CLI/SDK captures sometimes omitted the optional
keyboard fact. These runs did not reproduce a stray dismissal or an off-screen
visible producer frame. They do not establish that every producer is correct or
that the historical downstream observation cannot occur elsewhere.

The earlier scripted-client fixture modeled form mutation on any keyboard
command. That proved adapter dispatch under synthetic data, not that the real SDK
mutates the form. These native results support withdrawing the extra adapter
guard proposed in [PR #1561](https://github.com/tester-army/e2e/pull/1561).

## Run

Use a dedicated simulator and the SDK installed from the repository's frozen
lockfile. The tested base is upstream `1bbda5a`; its mobile engine uses SDK
0.21.36. `PROOF_UDID` below must identify your exclusively owned simulator.

```sh
pnpm install --frozen-lockfile --ignore-scripts
xcodebuild \
  -project reproductions/keyboard-dismiss-native/KeyboardDismissDemo.xcodeproj \
  -scheme KeyboardDismissDemo -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/keyboard-dismiss-native-build \
  CODE_SIGNING_ALLOWED=NO build

AGENT_DEVICE_STATE_DIR=/tmp/keyboard-dismiss-native-state \
node packages/mobile/node_modules/agent-device/bin/agent-device.mjs install \
  /tmp/keyboard-dismiss-native-build/Build/Products/Debug-iphonesimulator/KeyboardDismissDemo.app \
  --platform ios --udid "$PROOF_UDID" --session keyboard-dismiss-native-proof

python3 reproductions/keyboard-dismiss-native/verify.py \
  --udid "$PROOF_UDID" \
  --sdk-cli "$PWD/packages/mobile/node_modules/agent-device/bin/agent-device.mjs" \
  --state-dir /tmp/keyboard-dismiss-native-state \
  --out /tmp/keyboard-dismiss-native-results
```

The verifier uses actual SDK commands and native accessibility refs. The positive
control selects the inner native switch thumb from the latest capture; the outer
SwiftUI Toggle container's center is not the thumb. Expected keyboard refusals
are checked by error code. Any other command error or unexpected form change
fails the run. Close the fixture's agent-device session after collecting evidence.
