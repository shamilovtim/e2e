# Implicit native press readiness: constructed UIKit evidence

[The intermediate whole-review investigation](intermediate-2a9-review/README.md) preserves 18 recordings, its exact source/gate, the actual guest-input failure, passed native AX/tree controls, and the remaining 500-control latency regression. It is not final-fix evidence.

[The rejected AX-bound experiment](rejected-633-ax-bound/README.md) preserves seven recordings and its unchanged safety checks; measured latency did not improve.

[The optional AbsoluteValue probe](optional-absolute-value-probe/README.md) preserves one bounded diagnostic recording. The optional fact was absent on an independently empty input, so its result is unknown; no fallback or support claim follows.

[The query-attributes prototype investigation](prototype-3c9-query-attributes/README.md) adds matched 500-control measurements, fast missing-binding refusals, and all 25 additional recordings. It explicitly records the rejected prototype’s placed-window and input-value regressions; it is not final-fix evidence. Setup recordings can show default simulator Springboard or Settings.

[The fixture-only final review](fixture-review-c7d640f/README.md) records SDK source `c7d640f`, its clean exact gate and that revision’s native golden-data recheck, with unchanged verified runtime artifacts.

[The independent web assertion fix](web-timeout-70d7f9b/README.md) records the pre-existing 2000/1999 ms CI failure and its bounded diagnostic assertion in PR #1690.

[The final SDK review follow-up](review-17a9673/README.md) records source `17a9673`, its passed exact gate, fresh production/unit native builds, nine selected native tests and a new unchanged-harness overlay video.

[The final SDK review evidence](final-ca43623/README.md) records source `ca43623`, its exact-commit gate, bounded native-only polling, the large-tree query correction, clipped and duplicate controls, and 19 additional generic fixture videos. Older runs retain their original source attribution.

The original 70-video bundle below is frozen at SDK `f757b60` and mobile `31ceef3`. [The SDK review-round append](review-965e77b/README.md) records the later coordinate fix, additional native checks and qualified limitations. Original results and hashes retain their original source attribution.

[The mobile review append](mobile-review-c282cf9/README.md) records the matched current-SDK timeout failure on upstream and cancellation/recovery on mobile `c282cf9`, with five additional videos.

[The mobile reference correction](mobile-reference-ac80493/README.md) records the final documentation-only `ac80493` follow-up, its passing docs checks and unchanged runtime source.

[Accepted-input ordering evidence](accepted-press-review-9dc33e8/README.md) adds three real native cases and the comment-only mobile `9dc33e8` attribution. The parent file manifest covers the original bundle plus this current navigation README; each append has its own manifest.

All application source, screenshots, videos and app event logs here are from constructed public UIKit fixtures. The patches contain generic upstream framework code. No production application data, source, configuration, backend address, account, device inventory, daemon state, token, lease or diagnostic archive is included. System-app smoke checks remain local and are not part of this bundle.

The SDK fix checks the existing native hittability predicate before ordinary ref-based presses. Tests keep their existing tap calls. The separate framework fix forwards cancellation for pending presses. It does not add a public wait API.

Exact versions, source fingerprints and fixture hashes are in `VERSIONS_AND_RESULTS.json`. Live smoke commit `f5369cb` and final commit `f757b60` have the same Git tree, `cd5cc4df9c140ed69476637993b032b34e598c4a`. The original fixture source is unchanged. Superseded 0a and f417 proofs have their own directories and are not final-head evidence.

## Outcomes

| Case | Base | Final candidate |
|---|---|---|
|750 ms custom UIKit fade, ordinary SDK ref presses | Actual source `5a836c0` exits 1, underlying 0 / overlay 1 | Final tree smoke `f5369cb` exits 0, underlying 1 / overlay 0, with the exact same exit-aware script |
|Deliberate 3000 ms fade | Published SDK baseline sends input before completion | Earlier `f2bc18d` broad fixture matrix passes |
|UIKit pageSheet / unblocked control | Passing controls | Both pass in the `f2bc18d` broad matrix |
|Native clipping, anonymous / duplicate bindings, moving interactive child | Safety checks exercised | `f2bc18d` ready controls pass; ambiguous identical controls are refused unsent; moved child receives no input |
|Main framework d8 with final SDK f2bc18d, 500 ms action timeout | Step fails at 500 ms but SDK request runs 3071 ms and later activates the control | Framework `31ceef3` with the same SDK cancels pending input; after full fade counters remain 0/0. Repeated with final tree `f5369cb`: passes, zero native input |
|Immediately following attempt | Covered by paired recovery probe | Receives exactly one input of its own |

`evidence/sdk-source-base-5a` and `evidence/sdk-final-js-f536` contain the exact source-base/final smoke pair. Harness SHA-256 is `d0062ebf47af505bbbb25b17bce4e8400c56e46917d319d99f5588c67b4a7599`; failed or empty oracles exit 1 after cleanup. `evidence/framework-fixed-timeout-final-js-f536` contains the final cancellation smoke. Earlier broad native coverage remains explicitly attributed to `f2bc18d`.

`evidence/framework-main-timeout-final-sdk` is the decisive framework failure video and trace. `evidence/framework-fixed-timeout-final-sdk` contains the matching fixed cases. `evidence/final-sdk/original` contains ordinary successful SDK sequences. Each video remains beside its native event log or framework trace where available.

The default simulator AX bridge and the existing alternate native producer were verified from actual diagnostics. `customActions:true` was used only to exercise the existing alternate capture route; it is not required by the fix. Native capture can finish after a 750 ms fade, so its moving-child case is ready-control coverage. The bridge case proves a child moving into the original point while the parent is blocked, then receiving no input after the SDK chooses a freshly guarded point.

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

`PUBLIC_FILES.json` lists the staged whitelist, hashes and sizes. `PUBLIC_AUDIT.json` records the privacy audit. All 70 staged videos decode at their first and final frames with zero requested time tolerances; see `VIDEO_DECODE_VALIDATION.json`. The exact-head local gate passed all runnable checks at `f757b60`: 17,861 unit tests and 1,320 related tests passed. `checks/agent-device-exact-validation.json` preserves the explicitly skipped or parked CI-only checks.
