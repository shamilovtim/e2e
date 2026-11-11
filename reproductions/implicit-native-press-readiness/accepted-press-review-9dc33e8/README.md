# Accepted native input cancellation: attempt and device ordering

All application source and media here are from a constructed UIKit fixture. No private application data or device diagnostics are included.

This investigates review feedback on e2e PR #1685. A canceled SDK promise can settle while accepted native work still runs. The adapter's in-flight set is therefore not itself a native completion barrier. The supported SDK cancellation contract provides the device-ordering boundary: [issue #3383](https://github.com/callstack/agent-device/issues/3383), implemented by merged [PR #3385](https://github.com/callstack/agent-device/pull/3385), holds the daemon's session/device execution locks while a sent native command drains.

The paired probe waits for the real native runner to log COMMAND_ACCEPTED for an ordinary e2e double tap, aborts the caller, ends the attempt, starts the next attempt and immediately requests an actual app relaunch followed by one tap. There is no controlled transport or synthetic native response in these three cases.

| Case | Local next attempt admitted before native completion | Device outcome |
| --- | --- | --- |
| Main d8, engine recording off | No | Old process received 2 taps; fresh process received exactly 1 own tap |
| Mobile c282, engine recording off | Yes | Relaunch/device work remained serialized; fresh process received exactly 1 own tap |
| Mobile c282, engine recording on | No, recording stop waited first | Fresh process received exactly 1 own tap |

The recording-off fixed case demonstrates the important distinction: local attempt admission precedes native completion, while the subsequent real app operation is fenced by the SDK. The native sequence completed at 05:35:54.240196Z. The fresh app's per-process event file, first written at appReady by the unchanged fixture, was created at 05:35:58.128853Z. Its only input was the following attempt's one tap. These are qualitative ordering observations, not performance measurements; other verification work was active on the host.

The SDK for these native probes was source commit 965e77bc0462516aa535a8f3060cb4b465fe86b5 with matching native a55 assets, identified separately from published 0.21.36. The supported bounded-drain implementation also exists in the pinned 0.21.36 package. The comment-only follow-up 9dc33e80fc2545e2af56519fc780590259472b77 has the same normalized TypeScript AST as tested c282; see RUNTIME_EQUIVALENCE.json.

This is not an unlimited termination guarantee. The existing SDK drain stops at its original native-command deadline, an unavailable status, or notAccepted, and can leave an abandoned command charge. The client rejecting on cancellation does not prove all native work stopped. A controlled external transport that ignores cancellation also does not exercise the production daemon's locks; that seam is not evidence of a production ordering failure. This bundle does not claim to test the SDK's unconfirmed-drain fault path.

`request.started` in the curated SDK lifecycle log means request handling began; it is not proof the request acquired its execution lock or launched the application. Native command completion and the fixture's process-specific event files are the device evidence. Full daemon state, leases, tokens, whole native test results and diagnostic exports are excluded.
