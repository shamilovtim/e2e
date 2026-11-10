# Native evidence for e2e issue #1563

Recorded 2026-11-10 against **unmodified main `d8b694ffa48b04c94d70a11cc280267f1ea9a100`**, which includes #1564 (`f45d9f869e97c7020f96ec9ea1f6e335d95b32c4`). This uses the real built CLI, adapter, SDK, UIKit app and iOS simulator. No SDK client is scripted.

Versions: `e2e` 0.23.0, `@e2e-dev/mobile` 0.12.6, `agent-device` 0.21.36, Node 24.22.0; iPhone 15 Pro simulator / iOS 27.0. Version fields identify builds from the pinned main commit, not the older published mobile 0.12.6 contents. See [manifest](evidence/manifest.json).

## Scope

The app is a **small native reproduction constructed for this issue**, not a production app. Its custom composite overlay contains a backdrop and panel. UIKit animates those children's alpha to zero for 750 ms; their parent touch-owning container is removed in the animation's completion callback. The underlying button remains in the accessibility tree at unchanged bounds. `Overlay.touchesBegan` only logs an actual delivered event; it does not fake an input result. There is no delayed task or SDK mock deciding whether a tap is intercepted.

This reproduces a custom-overlay lifecycle gap. It does not establish that every native modal has that gap: the UIKit `pageSheet` control passes. The 3,000 ms fade is a separate deliberately slow diagnostic; it is not needed for the 750 ms result. No Android claim is made.

## Results

All attempts used one worker, zero retries, and completed cleanup without secondary errors. All eight SDK recordings decode at their first and last frames; see [video validation](evidence/video-validation.json).

| Case | Configured transition | Result |
| --- | --- | --- |
| Composite UIKit overlay, 750 ms fade | 1,000 ms | Failed, underlying taps 0 / overlay touches 1 |
| Same 750 ms case, three separate repeats | 2,000 ms | Failed 3/3 with the same counters |
| Composite overlay, deliberately slow 3,000 ms fade | 1,000 ms | Failed with the same counters |
| UIKit native `pageSheet` dismissal | 1,000 ms | Passed twice, underlying taps 1 / overlay touches 0 |
| 750 ms fade plus a diagnostic 1,000 ms pause before the next tap | 1,000 ms | Passed, underlying taps 1 / overlay touches 0 |

The last comparison is a controlled diagnostic, **not an API implementation or a recommendation to add sleeps to tests**. Whether a new public API is appropriate remains the maintainer's decision.

The primary [trace](evidence/main-1000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/trace.md) has:

- Step 3: `Close overlay` tap succeeds.
- **Step 4: `Underlying action` tap succeeds in 365 ms.**
- Step 5: the observable counter assertion fails, showing the overlay received that tap.

The native [event log](evidence/native-events/events-40728.json) proves delivery before completion: dismissal begins at 2,938.09 ms, the overlay receives the touch at 3,221.57 ms (**+283.48 ms**), and the UIKit completion runs at 3,690.79 ms (**+752.70 ms**). No underlying action callback occurs. Increasing `transition` does not change this unchanged-control path; #1564 specifically added the wait for root swipes.

In the passing diagnostic [event log](evidence/native-events/events-50886.json), dismissal begins at 2,906.63 ms, completes at 3,659.15 ms, then the underlying action receives the tap at 4,273.28 ms.

## Reproduce

Requires Xcode with iOS simulator tools, an arm64 Mac, Node and pnpm. Build the pinned public framework checkout (its lockfile supplies the SDK version):

```sh
git clone https://github.com/e2e-inc/e2e.git framework
git -C framework checkout d8b694ffa48b04c94d70a11cc280267f1ea9a100
cd framework
pnpm install --frozen-lockfile
pnpm --filter e2e run build
pnpm --filter @e2e-dev/mobile run build
cd ..
```

From this reproduction directory, supply that checkout and a simulator you own. The retained run used a fresh iPhone 15 Pro / iOS 27.0; do not use a simulator held by another task.

```sh
export FRAMEWORK=/absolute/path/to/framework
export OVERLAY_DEVICE=YOUR_SIMULATOR_UDID
export AGENT_DEVICE_STATE_DIR="$PWD/driver-state"
mkdir -p node_modules/@e2e-dev
ln -s "$FRAMEWORK/packages/e2e" node_modules/e2e
ln -s "$FRAMEWORK/packages/mobile" node_modules/@e2e-dev/mobile
python3 source/build.py
xcrun simctl boot "$OVERLAY_DEVICE" # skip if already booted
xcrun simctl bootstatus "$OVERLAY_DEVICE" -b
xcrun simctl install "$OVERLAY_DEVICE" build/OverlayFixture.app
node "$FRAMEWORK/packages/e2e/dist/cli/bin.js" run tests/overlay.e2e.ts --video on --trace on --reporter list,markdown --output fresh-main-1000
OVERLAY_TRANSITION=2000 node "$FRAMEWORK/packages/e2e/dist/cli/bin.js" run tests/overlay.e2e.ts --grep '^UIKit fade 750ms$' --repeat-each 3 --video on --trace on --output fresh-main-2000
node "$FRAMEWORK/packages/e2e/dist/cli/bin.js" run tests/wait-diagnostic.e2e.ts --video on --trace on --output fresh-wait-diagnostic
```

The first two commands intentionally exit 1 for the reproduced failed assertion. The diagnostic wait exits 0. Native logs are app-owned `Documents/events-<pid>.json`, available through `xcrun simctl get_app_container "$OVERLAY_DEVICE" dev.e2e.overlay1563 data`.

The original first run used the default failure-only trace mode, so the passing page-sheet control has a separate [trace-on run](evidence/native-sheet-control/results/overlay-uikit-page-sheet-control-bf6cf67877c91427/trace.md). All attempts retain SDK videos under their report directories.

Source SHA-256: `4ba6fb0e04317a1096ab5496dfeeec9d521ba5a59696e8052330ccff117bb9dd` (`source/OverlayFixture.swift`).

Only public fixture source, configs/tests and selected reports/media should be shared. SDK daemon state and session diagnostics are intentionally excluded.
