# Native screen-swipe timing

Native iOS evidence for [upstream PR #1564](https://github.com/tester-army/e2e/pull/1564).
The [public UIKit fixture and build instructions](https://github.com/shamilovtim/e2e/tree/4babb9ae37d64edcd0d6f457ad799a2a1b0c8aaa/reproductions/root-scroll-native)
produce the exact app binary used here. It contains a 40-row list, a Notes field,
and an overlay composer. These tests leave the keyboard closed.

## Run the cases

Use an iPhone 15 Pro / iOS 27.0 simulator that you own. Build and install the
fixture above. In each runner checkout, copy this directory to
`reproductions/root-swipe-timing-1564`, then run:

```sh
pnpm install --frozen-lockfile
pnpm --filter e2e build
pnpm --filter @e2e-dev/mobile build
cd reproductions/root-swipe-timing-1564
E2E_ROOT_SWIPE_DEVICE=<owned-UDID> E2E_ROOT_SWIPE_TRANSITION=500 node ../../packages/e2e/dist/cli/bin.js run --config e2e.config.ts --workers 1 --retries 0
```

Use isolated agent-device state and run builds sequentially on that device.
Repeat with `E2E_ROOT_SWIPE_TRANSITION=1500`. Device selection is parameterized
here; the measured configuration named the dedicated simulator directly.

## Measured comparison

- Main: `1bbda5a84987257184457f1374729ed31ece594e`.
- Candidate: `f52bdc7daa288dd452c48a6564c9ef73c47e6029`.
- Both use agent-device 0.21.36 and the same installed fixture binary.
- Official `scripts/bench-ab.ts`, three measured pairs plus one excluded warmup
  per budget, one worker, zero retries. Identical temporary suite files were
  placed under `apps/root-swipe-native-1564` in both prepared checkouts.
  Production files matched the recorded commits; temporary files explain the
  report's dirty-head flag.
- Native screen recording ran outside the CLI. The CLI's recording was off in
  both builds. Clips below were cut at test boundaries and compressed after
  measurement. Timings come from CLI reports, not clip lengths.

```sh
E2E_ROOT_SWIPE_TRANSITION=500 node scripts/bench-ab.ts --suite root-swipe-native-1564 --config e2e.config.ts --no-build --warmup 1 --min-pairs 3 --max-pairs 3 --batch 1 --timeout 8 --out <report-directory> -- --retries 0 --video off
```

The base suite directory and both package builds must be prepared before using
`--no-build`. [Compact reports](./results.json) retain case medians, action API
components, and the harness's behavior/counter comparison.

| Budget | Case | Main body | Candidate body |
| --- | --- | ---: | ---: |
| 500 ms | Four consecutive swipes | 4.48 s | 6.35 s |
| 500 ms | `scrollUntilVisible`, row 25 | 5.44 s | 6.53 s |
| 1500 ms | Four consecutive swipes | 4.44 s | 10.32 s |
| 1500 ms | `scrollUntilVisible`, row 25 | 5.69 s | 10.46 s |

Both builds pass both cases with matching reported behavior and counters. These
fixture runs measure pacing cost, not a failure-rate improvement or the complete
Expo benchmark suite.

## Native clips

One measured pair per budget. Every clip is playable and its final frame decoded.

| Budget | Main | Candidate |
| --- | --- | --- |
| 500 ms | [Native clip](./500-base-proof.mp4) | [Native clip](./500-head-proof.mp4) |
| 1500 ms | [Native clip](./1500-base-proof.mp4) | [Native clip](./1500-head-proof.mp4) |
