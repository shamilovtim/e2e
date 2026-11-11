# Implicit native readiness: final review follow-up

This append records exact source `17a96733f87bc571f0c785eac99230691b3c5bf8` for [PR #4391](https://github.com/callstack/agent-device/pull/4391). Ordinary primary resolved iOS `press` and `click` calls still wait implicitly for their strictly matched native control. No test-author wait API is added.

The six accepted review fixes clarify the dispatch-disclosure test, cover runner demand, assert the typed changed-target refusal, correct historical command-test bookkeeping, give Revyl a readiness-specific unavailable hint, and use XCTest's secure-field enum in the native model. Sixteen repeated labels were removed only from geometry fixture cases; no cases or assertions were removed. The separate portable snapshot package keeps its numeric wire type. The fixture helper's unused type expansion was declined with the repository's no-test-only-production-export rule and current fixture coverage.

## Verification

[The passed exact-commit receipt](checks/agent-device-exact-validation.json) records 17,893 passing unit tests, one existing skipped test, 1,322 passing related tests, and all runnable local build/repository checks. CI-owned and parked lanes are explicitly distinguished from passes.

[Fresh native verification](native/NATIVE-VERIFICATION.json) records separate production and unit builds from this exact source and native fingerprint `615de8dee67b5d299f4507c0d12f76c16fc98cc0df2259afd83bd573034f703b`. The original eight selected native tests and the changed command-classification test all passed. This is nine selected methods, not a full native-suite claim.

[The new video](native/smoke/fade750-1/video.mp4), [native events](native/smoke/fade750-1/native-events.json) and [result](native/smoke/fade750-1/result.json) use the unchanged public d006 harness against the fresh production runner and current built JavaScript. The ordinary overlay sequence exits 0 with intended taps 1 and overlay touches 0. Dismissal completed at 7,028.46 ms; the intended tap arrived at 7,225.10 ms. This functional smoke is not a new performance benchmark. All 112 video samples decoded without error, and both included frames were visually audited.

[Earlier matched measurements and broader fixture coverage](../final-ca43623/README.md) retain their original source attribution: performance/geometry at `380`, intermediate enumeration at `965`, and the earlier final smoke at `bef`. No equality between this source's JavaScript and `bef` is claimed. The same public harness failed on original source base `5a` with counters 0/1; that historical result is unchanged.

[The source patch](patches/agent-device.patch), [source audit](checks/source-patch-audit.json), native provenance and per-file hashes accompany this append. All app/media evidence comes from standalone generic UIKit fixtures. No private application data, credentials, environment, daemon state or diagnostic archives are included. Partial point occlusion and degraded unanchored window geometry remain separately tracked in issues #4347 and #4399.
