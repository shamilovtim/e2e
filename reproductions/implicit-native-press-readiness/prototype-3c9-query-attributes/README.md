# Generic native-readiness investigation evidence

These recordings document a native query prototype at 3c9, its actual 5a source baseline, and paired older 615 native artifacts. The prototype improved the previously unbounded matching approach but has confirmed placed-window and empty-field selector regressions. It is not final-fix evidence.

Each case has a whitelisted proof, original recording, decoded first/last frames, and full-stream decode receipt. Setup/discovery failures remain labeled as setup. Diagnostic builds add logging outside the source checkout; their fingerprint/binary differ from production625 and are explicitly attributed. No SDK protocol metadata was forged.

For empty fields, AX/tree source bindings already omit the live placeholder value under 615 within the proposed readiness feature; this is not asserted as a bug on original upstream5a. Ordinary selector focus uses the live value and succeeds under 615; the 625 snapshot-attributes matcher newly refuses that selector. Its empty-value source binding also becomes ready, demonstrating a change in both directions. The final fix must resolve the value contract separately.

The landscape keyboard was exposed with a coordinate-only setup focus after that failure; only read-only key readiness was checked. No key was typed. The blocked duplicate observation was intentionally caller-canceled with dispatched unknown; it is not asserted as a product timeout.

Cold open/startup/native setup and warmed press routes are reported separately. All 500-control matched cases use one frozen v1.1 fixture binary and one owned phone. Placed geometry uses native Window geometry and independent live target reads; the fixture event actionScreenFrame is window-local and is not a screen oracle.

Only generic fixtures and default simulator UI are intended for this subset. Raw state, process logs, runner tokens, device identifiers, home paths, app containers, xcresult and inventories are excluded. This frozen investigation subset is separate from the corrected implementation and its final verification.

Video endpoint PNGs use the track preferred transform. Recordings spanning a device rotation can contain sideways or inverted interface content; no adaptive rotation, cropping, or content edits were applied. The original video bytes are retained.

The [complete prototype source patch](prototype-source.patch) applies to the exact source baseline in [PROTOTYPE-SOURCE.json](PROTOTYPE-SOURCE.json). The corrected implementation is tracked in [PR #4391](https://github.com/callstack/agent-device/pull/4391).
