# SDK review-round evidence

Generic standalone UIKit fixtures only. This append preserves 14 videos and their native event logs, with exact measured build hashes in [BUILD-PROVENANCE.json](BUILD-PROVENANCE.json). [MANIFEST.json](MANIFEST.json) describes each case, qualifications and cleanup. The source delta was frozen for native QA and then committed as `965e77bc0462516aa535a8f3060cb4b465fe86b5`; the exact-commit gate receipt is separate from this measured-build evidence. [The independent attribution audit](checks/independent-review-and-media-audit.json) records unchanged native bytes and 628 of 629 generated JavaScript files; the CLI parser `src/args.js` differs and its old bytes were not retained. Full generated-build byte equality is not claimed.

| Case | Before | Corrected candidate |
|---|---|---|
| Controlled placed iPad window, ordinary ref | `f757b60` retained a window-local source frame while the live control used screen coordinates; readiness refused, native action 0 | Same producer, window and point; normalized source/public/live frames agree and native action 1 |
| Healthy first selector in placed window | Original upstream `5a836c0`: native action 1 | Native action 1 |
| Degraded repeated capture in placed window | Original upstream `5a836c0` reports success at a window-local point; native action 0 | Explicit caller cancellation after 6000 ms; `COMMAND_FAILED / request_canceled / dispatched:unknown`, native action 0 through event read. No public unsent proof or extended post-cancel observation is claimed |
| iPhone portrait/landscape and keyboard | Intended refs/selectors and separate parent/child controls work; duplicate selector refused | Same controls pass; duplicate safety retained |
| 750 ms overlay dismissal, identical public harness | Original upstream `5a836c0` exits 1, underlying 0 / overlay 1 | Frozen source committed as `965e77b` exits 0, underlying 1 / overlay 0; action occurs after fade completion |
| Cancellation during 3000 ms fade | Separate regression covered in parent bundle | Abort at 350 ms, observe for 4200 ms through completion; native underlying 0 / overlay 0 |

The cancellation harness originally expected the nonexistent `COMMAND_CANCELLED` code. Its failed raw assertion is preserved; [the assessment](overlay-cancel/assessment.json) distinguishes that harness mistake from the documented cancellation result and the independent native no-late-input oracle.

[The source and native proof summary](checks/native-proof.json) records the identical public `sdk-acceptance.mjs` harness hash `d0062ebf…`, source commit, native fingerprint and 52 passing Swift package tests. [The SDK patch](patches/agent-device.patch) is against upstream source `5a836c0`.

[Eight selected native tests passed](NATIVE-UNIT-SUMMARY.json). [Video validation](VIDEO-VALIDATION.json) records actual and requested frame timestamps. Static recordings can yield an earlier final image; native events and live XCUI frame probes remain independent oracles. The fixture event key `actionScreenFrame` is window-local and is not treated as a screen-space oracle.

General repeated/degraded placed-window capture remains limited: no viewport offset is guessed. The measured source-base failure is a separate existing issue. This append makes no claim for macOS, physical devices, iPad landscape or general multiwindow coverage. Original fixture media and result bytes are preserved except the explicitly recorded publication transforms in [PUBLICATION-TRANSFORMS.json](PUBLICATION-TRANSFORMS.json).

The [exact-commit affected gate](checks/agent-device-exact-validation.json) passed at `965e77b`: 17,874 unit tests and 1,322 related tests passed; one unit test was skipped. CI-only and parked checks remain explicitly excluded from the local pass. The independent source review found no actionable issues.
