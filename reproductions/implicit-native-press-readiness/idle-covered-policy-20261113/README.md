# A covered idle target after an ordinary session reopen

This bounded two-case comparison addresses [the idle-only decision](https://github.com/callstack/agent-device/pull/4391#issuecomment-6863144621). It is an existence counterexample, not a frequency estimate or latency benchmark.

Using the existing public UIKit fixture, each case opens a persistent cover through an ordinary SDK press, closes only the SDK session with `apps.close({})`, and reopens the same alias/app with `relaunch:false`. The app process and cover survive; the new normal session has no motion baseline and no prior input. No fixture code, SDK history, producer or response is overridden. Both cases verify the same public target frame and the fresh native Button binding/full rectangle and intended point.

| Behavior | Native readiness calls | Native target taps | Intended / cover input | SDK outcome |
| --- | ---: | ---: | --- | --- |
| Verified candidate `58d22b1` | 19, all blocked | 0 | 0 / 0 | Caller canceled; public dispatch unknown |
| Isolated idle-skip control `31062db` | 0 | 1 | 0 / 1 | Reported success at the intended point |

The experimental control implements only the requested decision-kind preservation and idle-only skip: two TypeScript files, +8/-5, one emitted JavaScript bundle differs. It is **not adopted into the candidate**. Its safety oracle failed and exits1; qualification of the counterexample does not turn unsafe behavior into a passing product result. Both cases qualified on their first attempt, with no reruns or harness errors.

Both target calls receive the same declared approximately two-second plain caller signal. The control succeeds before its signal fires; the successful response is not relabeled canceled. These instrumented timings establish ordering, not a default daemon deadline or performance result. After each target request ends, an ordinary Close overlay action releases the cover. Actual fade completion plus1100ms observation preserves the respective0/0 and0/1 counters with no late input.

[The selected evidence and complete protocol](selected/README.md) include exact source/runtime/native identities, ordered observations, actual raw-native command counts, executed-script hashes, fixture source, control patch and separate unmeasured postflight verification. Both632-file runtime sets were pinned. The reused native products were actually built at58 and are source-equivalent for the control; they were not rebuilt or relabeled at310. Cached guest-bridge build origin remains unknown and source/binary equivalence is pinned.

Both original videos fully decoded: **578 samples, zero decoder errors**. Each has one video track, no audio/AV metadata and only the standard recording-policy tag. All four endpoint frames were visually inspected and show only the generic fixture/default simulator screens. Intermediate frames were not individually manually inspected. See [media review](media/REVIEW.json).

This demonstrates the already-identified post-open lifecycle gap: absent motion history does not establish native actionability. It makes no universal cover-detection claim and does not estimate prevalence. The full verified [58 candidate and22 earlier recordings](https://github.com/shamilovtim/e2e/tree/2c85530dc3479f7dfbd7fce924e7f5d9dedb9435/reproductions/implicit-native-press-readiness/integrated-58d22b1-verification) remain unchanged. Its source-branch push is still blocked by workflow authorization; current hosted CI is not claimed.

All app content is from a constructed generic fixture. Device/process/session identifiers, private host paths, tokens, sockets and raw logs are omitted. Executed-source redactions retain original and published hashes separately.
