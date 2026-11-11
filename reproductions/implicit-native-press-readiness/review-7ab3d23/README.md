# Secure binding coverage and user documentation follow-up

SDK PR #4391 source 7ab3d2330353587131368547eab52491bd294489 adds the missing canonical SecureTextField comparison case, with ordinary TextField and numeric native-type negative controls. It also clarifies the valueSource type comment and the user-visible placeholder/secure-value limitations. Only three files changed from d3e3f43; production behavior and native sources are unchanged.

The new secure regression passed 22 tests, failed exactly the secure case when the canonical exemption was deleted (21 passed, one intended failure), and passed all 22 after restoration in an independently installed/built checkout. The committed exact-head gate passed 17,895 unit tests with one existing skip and 1,323 related tests; parked and CI-only lanes retain their receipt status.

All 629 runtime JavaScript files are byte-identical to d3e3f43 and the complete native source fingerprint remains 7938c697fc985a32b3522f9c4431f82252468a265ef672f504404d0d865647ad. The [native recordings and execution evidence](../review-d3e3f43/native/README.md) retain their original d3 source attribution; no new native run is claimed here.

The two native review suggestions were assessed without changing the implementation: capture-time raw input identity requires the explicit raw read because the flat sweep has no retained snapshot; its added per-input cost is acknowledged. Optional window offsets remain supplemental and cannot invalidate a healthy target when an auxiliary window disappears. Actual unreadable required roots still propagate a coded refusal. The PR threads contain the detailed dispositions.

Preflight was recorded before the source push. No private application data, host state, device identifiers, credentials or raw logs are included.
