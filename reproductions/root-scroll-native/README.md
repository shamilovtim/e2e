# Root scrolling with a visible keyboard and pinned composer

Public UIKit and Android fixtures for tester-army/e2e #1557 and #1564. Each has
40 rows, a Notes field, a 64-point/dp composer above the keyboard, and a visible
scroll-offset/composer-touch counter. There is no backend or account data.

## Recorded result, 2026-11-05

With pristine agent-device **0.21.36** and upstream e2e main
`1bbda5a84987257184457f1374729ed31ece594e`, slow, normal (`none`) and fast
root scrolling all pass on an iPhone 15 Pro simulator with iOS 27.0 and an
Android 37.1 emulator with Gboard. Each reaches terminal **Row 39**, keeps
Notes empty and leaves composer touches at zero. The terminal row avoids
assuming a fixed fling distance through the middle of the list.

The proposed #1557 raw-swipe branch, rebased onto that main at
`2405db7ce6643e3808432f019c946d8ca547fe23`, passes slow/normal on Android but
fast starts on Composer: offset stays zero and the touch counter reaches 67.
That is a regression introduced by the PR, not a reproduced main bug.
`results.json` records the identities and limits.

The SDK already owns live keyboard clipping and input-accessory clearance:
[implementation](https://github.com/callstack/agent-device/blob/v0.21.36/packages/contracts/src/scroll-gesture.ts#L423-L522)
and [boundary/floating-keyboard cases](https://github.com/callstack/agent-device/blob/v0.21.36/contracts/fixtures/scroll-keyboard-policy.json).

## Build the adapter

From the repository root, install dependencies and build `e2e` then mobile:

```sh
pnpm install --frozen-lockfile
pnpm --filter e2e run build
pnpm --filter @e2e-dev/mobile run build
cd reproductions/root-scroll-native
```

The default config uses this checkout's built mobile engine. To compare a
separate built checkout, set `SCROLL_ADAPTER` to its absolute
`packages/mobile/dist/index.js` path. The proposed baseline is retained on
`shamilovtim/e2e` branch `codex/1557-native-before-review`.

## iOS, Apple Silicon Mac

Build with Xcode's installed simulator SDK. Use only a simulator you own.

```sh
python3 ios/build.py
xcrun simctl install "$SCROLL_DEVICE" ios/ScrollFixture.app
SCROLL_PLATFORM=ios AGENT_DEVICE_STATE_DIR="$PWD/.state/ios" \
  node ../../packages/e2e/dist/cli/bin.js run --config e2e.config.ts --target ios --video on
```

Set `SCROLL_DEVICE` to the owned simulator's UDID and export it before the run.
The software keyboard must be enabled. The fixture launches without a keyboard;
tapping Notes opens it. This same app supports #1564's consecutive-scroll
measurements without focusing Notes.

## Android

Requires an existing SDK with platform `android-37.0`, build tools `37.0.0`,
and a JDK. Set `ANDROID_SDK_ROOT`, `JAVA_HOME`, and `SCROLL_DEVICE` to an owned
emulator serial. The app targets API 37 and uses IME/system-bar insets.

```sh
python3 android/build.py
"$ANDROID_SDK_ROOT/platform-tools/adb" -s "$SCROLL_DEVICE" install -r android/ScrollFixture.apk
"$ANDROID_SDK_ROOT/platform-tools/adb" -s "$SCROLL_DEVICE" shell settings put secure show_ime_with_hard_keyboard 1
SCROLL_PLATFORM=android AGENT_DEVICE_STATE_DIR="$PWD/.state/android" \
  node ../../packages/e2e/dist/cli/bin.js run --config e2e.config.ts --target android --video on
```

The test selects the real Gboard IME after focusing Notes. agent-device's empty
input-helper IME is unsuitable for a visible-keyboard proof. Setup waits until
the reported keyboard band and the composer's bottom agree, so a sliding IME
frame is not mistaken for a settled keyboard. No keyboard facts are injected.

Metadata is written under `.e2e/evidence`; the runner records the native videos.
The iOS XCTest route used here omits a keyboard wire fact, while the Android
helper reports a measured band. Both are left to the unmodified SDK scroll path.
