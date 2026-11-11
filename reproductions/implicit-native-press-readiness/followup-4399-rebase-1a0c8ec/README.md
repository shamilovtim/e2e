# Rebased #4399 validation

Source base: `b6fa2ecb583137866d267f56b2597c4f633412d6`.
Source head: `1a0c8ecc887a2c40a469f66d78e07e9d76afbf57`.
Original live-proof head: `3d1ae71e00ec75fa7e59e7c2624ec55b3f249b2b`.

The fresh exact-commit gate passed at the rebased head with a clean, unchanged checkout. All 12 runnable checks passed: 373 related tests and 19,086 unit tests passed; three existing unit tests were skipped. GitHub-authoritative coverage, Apple, Linux/web smoke lanes remain separate obligations. Parked manual replay lanes were not run.

The fix remains 25 files, +718/-26. All 24 non-help fix files are byte-identical across the rebase. The sole help-file difference preserves upstream HarmonyOS visibility wording beside the unchanged iOS origin clauses. Independent review found no new issue.

All 631 rebuilt JavaScript files were compared with the retained original manifest: 619 are identical and 12 changed; no file was added or removed. `built-js-comparison.json` lists both hashes for every changed file. `changed-js-owners.json` maps those 12 chunks to reviewed source owners and checked emitted-code anchors; dependent chunks are identified explicitly. Both complete manifests are included.

The entire native runner and snapshot-presentation source trees are identical between the original and rebased heads. All 12 prior production/unit/baseline native artifact hashes were rechecked and match. No fresh native run occurred after rebase. Simulator recordings, payload XCTest, and native builds remain attributed to `3d1ae71`; see the sibling `followup-4399-3d1ae71` evidence bundle for the actual natural deferred comparison.

`exact-validation.json` contains a public-safe gate summary. `source.diff` is the 25-file patch against the new base. `range-diff.txt` compares the original and rebased commit ranges. `native-source-and-prior-binaries.json` records source tree identity and actual prior artifact hashes.
