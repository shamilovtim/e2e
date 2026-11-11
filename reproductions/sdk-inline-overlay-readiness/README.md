# Existing SDK readiness investigation

2026-11-10. No engine, SDK, or public fixture implementation was changed for these runs.

Pinned SDK `agent-device` 0.21.36, the current stable release. Public fixture and native source SHA remain those in [the original reproduction](https://github.com/shamilovtim/e2e/tree/b2126a9bba45a91e016284b622cf297dc60ac033/reproductions/overlay-transition-native-1563). A fresh owned iPhone 15 Pro / iOS 27.0 simulator was used.

## Native results

All SDK interactions use the real client and owned session. Only the final `nativeQuery` diagnostic reads the existing native runner directly, with that owned runner's token loaded internally. No token is included in the saved results. This is a probe of an existing native capability, not a proposed way for the e2e adapter to access a runner.

| Existing path | Correct underlying recipient | Observation |
| --- | --- | --- |
| Ordinary SDK ref press | 0/3 | Overlay receives the touch |
| Close press with settle quiet 150 ms | 0/3 | Reports settled:true after 253–262 ms |
| Close press with producer-default settle | 0/3 | Bridge quiet window is 300 ms, settled:true after 395–408 ms |
| Close press with settle quiet 1,000 ms | 3/3 | Timing control, not native animation completion |
| Stock UIKit page sheet | 1/1 | Passing control |
| Existing SDK get attrs before next press | 0/1 | Returns geometric hittable:true in 52 ms while overlay still blocks |
| Existing native querySelector read before next press | 0/1 for ensuing ordinary press | Query correctly reports found:false while blocked; ordinary press ignores it |

The custom overlay reports presentedSurface:absent before, during, and after dismissal. The stock page sheet reports absent, presented before close, presented immediately after close, then absent after completion. A presented-surface comparison alone cannot fix the inline custom overlay.

## Existing accurate native predicate

The direct native querySelector probe asks for the fixture's unique `Underlying action` identifier. Native `findElement` checks XCUIElement.isHittable and filters blocked matches. It returns:

- Before overlay: found:true, hittable:true, 115.7 ms.
- While overlay is fully open: found:false, 55.2 ms.
- Immediately after Close while fading: found:false, 52.4 ms.
- After completion: found:true, hittable:true, 86.4 ms.

The ordinary SDK press after the false diagnostic read still lands on the overlay. This proves an existing internal native signal is accurate for the fixture, but normal SDK ref presses/public get-attrs do not use it to gate dispatch. It does not prove generic identity binding for anonymous or duplicate targets; an implementation must retain the resolved target's identity and point and fail safely on ambiguity.

[Native predicate result and video](results/nativeQuery-1/) · [Compact results and native event timelines](summary-compact.json) · [All detailed SDK results](summary.json) · [Video validation](video-validation.json).

All 15 recordings decode at the first and final frames, including every wrong-recipient case. Native events are app-owned logs; the delay used to read their final state occurs only after the tested dispatch and cannot postpone the input under test.

## Current upstream source audit

Current SDK main was `5a836c05d5abfe3daa7556af4a1906a1e1029e17`.

- [Native selector query](https://github.com/callstack/agent-device/blob/5a836c05d5abfe3daa7556af4a1906a1e1029e17/apple/runner/AgentDeviceRunner/AgentDeviceRunnerUITests/RunnerTests%2BInteraction.swift#L231) reads actual XCUIElement.isHittable. This is distinct from snapshot geometric actionability, made explicit by [#1933](https://github.com/callstack/agent-device/pull/1933) and [#2775](https://github.com/callstack/agent-device/pull/2775).
- [Moving-target gate](https://github.com/callstack/agent-device/blob/5a836c05d5abfe3daa7556af4a1906a1e1029e17/packages/command-runtime/src/commands/interaction/runtime/moving-target-gate.ts#L120) still treats same-rect targets as stationary. Its file blob is identical to 0.21.36.
- [Existing settle](https://github.com/callstack/agent-device/blob/5a836c05d5abfe3daa7556af4a1906a1e1029e17/packages/command-runtime/src/commands/interaction/runtime/stable-capture.ts#L360) confirms broad iOS modal dismissals for 1.5 seconds, but an absent presented-surface fact disables that confirmation. The main-vs-release difference here only moves producer quiet defaults into the producer registry.
- The main snapshot-occlusion difference adds descriptions to backend-owned coverage decisions; its new covering-element source is the TV CDP backend, not a new iOS custom-view hit test.
- Android bounded readiness [#3815](https://github.com/callstack/agent-device/pull/3815) is merged; the e2e opt-in integration [#1253](https://github.com/e2e-inc/e2e/pull/1253) is closed unmerged and Android-only.
- [#4278](https://github.com/callstack/agent-device/pull/4278) refactors snapshot route settlement, with same producer/warning behavior, rather than adding animation readiness.
- [#3599](https://github.com/callstack/agent-device/pull/3599) deliberately removed missing-target readiness polling. That is different from waiting for an already-resolved but covered target.

No existing default or opt-in short quiet-window fix was found for this case. An accurate internal native predicate already exists and should be reused inside the SDK readiness owner rather than adding a public test wait or accessing private runner credentials from the e2e adapter.

## Cleanup and sharing

The owned simulator, session, and isolated daemon were cleaned up after verification.

Keep driver state, daemon diagnostics, and private runner lease files out of public evidence. The source scripts read those own-resource credentials at runtime and contain no credential values.

## Reproduce the ordinary SDK paths

Build and install the linked public UIKit app on a simulator you own. In this directory, install the pinned local dependency, set `OVERLAY_DEVICE` to that simulator, then run `node compare.mjs`. Each case relaunches the fixture. Retained results below are from the original unmodified SDK, with no input-readiness patch. The native query diagnostic uses the SDK owner's existing internal runner command; it is evidence for implementation inside that owner, not a supported adapter integration.

`XCUIElement.isHittable` describes whether some point is hittable. It does not certify the resolved center point, so the proposed guard must preserve existing point selection and occlusion checks. Partial custom covers remain a separate concern in callstack/agent-device#4347.
