# Implicit native press readiness: constructed UIKit evidence

Every source, screenshot, video and app event log here is from a constructed public UIKit fixture. No production application data, source, configuration, backend address, account, device inventory, daemon state, token, lease or diagnostic archive is included. System-app smoke checks remain local and are not part of this bundle.

The SDK fix checks the existing native hittability predicate before ordinary ref-based presses. Tests keep their existing tap calls. The separate framework fix forwards cancellation for pending presses. It does not add a public wait API.

Exact versions, source fingerprints and fixture hashes are in `VERSIONS_AND_RESULTS.json`. The original fixture source is unchanged. Superseded 0a and f417 proofs have their own directories and are not final-head evidence.

## Outcomes

| Case | Base | Final candidate |
|---|---|---|
|750 ms custom UIKit fade, ordinary SDK ref presses | Published SDK 0.21.36 sends the touch to the fading overlay; isolated source 5a proof pending | Final SDK f2bc18d passes 3/3; native completion precedes underlying tap |
|Deliberate3000 ms fade | Published SDK sends input before completion | Final SDK passes |
|UIKit pageSheet / unblocked control | Passing controls | Both pass |
|Native clipping, anonymous / duplicate bindings, moving interactive child | Safety checks exercised | Final ready controls pass; ambiguous identical controls are refused unsent; moved child receives no input |
|Main framework d8 with final SDK f2bc18d,500 ms action timeout | Step fails at500 ms but SDK request runs3071 ms and later activates the control | Framework 31ceef3 with the same SDK cancels pending input; after full fade counters remain 0/0 |
|Immediately following attempt | Covered by paired recovery probe | Receives exactly one input of its own |

`evidence/framework-main-timeout-final-sdk` is the decisive framework failure video and trace. `evidence/framework-fixed-timeout-final-sdk` contains the matching fixed cases. `evidence/final-sdk/original` contains ordinary successful SDK sequences. Each video remains beside its native event log or framework trace where available.

The default simulator AX bridge and the existing alternate native producer were verified from actual diagnostics. `customActions:true` was used only to exercise the existing alternate capture route; it is not required by the fix. Native capture can finish after a750 ms fade, so its moving-child case is ready-control coverage. The bridge case proves a child moving into the original point while the parent is blocked, then receiving no input after the SDK chooses a freshly guarded point.

## Reproduce the SDK comparison

Build the chosen SDK checkout and its matching native runner with that checkout's documented build commands. Build and install the public original app:

```sh
python3 fixtures/overlay-original/source/build.py
xcrun simctl install "$OVERLAY_DEVICE" fixtures/overlay-original/build/OverlayFixture.app
```

Supply paths to that exact build, and an owned simulator. Use the same script for source base and candidate, changing only these build/output inputs:

```sh
export SDK_ENTRY=/absolute/path/to/sdk/dist/src/index.js
export NATIVE_XCTESTRUN=/absolute/path/to/matching/runner.xctestrun
export NATIVE_DERIVED=/absolute/path/to/matching/derived-data
export OVERLAY_DEVICE=YOUR_OWNED_SIMULATOR_UDID
export ACCEPTANCE_ROOT="$PWD/fresh-verification-output"
ACCEPTANCE_CASE=fade750-1 node harness/sdk-acceptance.mjs
```

The full default SDK matrix uses the same script without `ACCEPTANCE_CASE`. The other public fixtures and harnesses cover clipping, existing control types and binding ambiguity. A final observation pause in the harness occurs after the tested press. It cannot delay that input.

The framework tests use the built main CLI and an isolated mobile package copy whose agent-device dependency points to the chosen SDK build. `framework-tests/e2e.config.ts` shows the existing device-provider configuration used to pin fresh native assets. Use a new `AGENT_DEVICE_STATE_DIR` for every build and ordinary `e2e run --video on --trace on` calls. `timeout-observe.e2e.ts` observes only after the intentionally timed-out input ended. `next-attempt.e2e.ts` has no added pause between attempts.

## Setup and scope

`evidence/setup` preserves the framework native-preparation failure videos and the optional-PID collection error video. These happened in setup or evidence collection; they are not SDK behavior failures. The latter press succeeded, but the first harness tried to copy an optional process-specific event filename. It was corrected to use the constructed app's own current-event alias. Native unit startup failures are summarized only in `NATIVE_UNIT_COUNTS.json`; full host diagnostics remain local.

The predicate establishes necessary native readiness. It does not certify every point against partial custom occlusion. Existing canonical target, geometry and point guards still apply. No Android behavior claim is made.

`PUBLIC_FILES.json` lists the staged whitelist, hashes and sizes. `PUBLIC_AUDIT.json` records the privacy audit. Decode receipts will be added after the broad gate's CPU work is idle.
