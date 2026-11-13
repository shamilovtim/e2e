# Mobile cancellation review follow-up

The five-file documentation/test follow-up at 66957b62067bfd5cb02b1b5abc4c1885e1df3f6c addresses review 5885417236 on e2e-inc/e2e#1685. It clarifies when cancellation occurs, requires nonempty observed press lists, and groups the existing support tests. Production mobile and SDK source are unchanged.

The Android ordering proof links the exact published agent-device 0.21.36 source: admitted requests retain session and device locks until the awaited backend promise settles. It does not claim an Android device run, universal native termination, or guarantees for arbitrary custom transports. The prior UIKit recordings remain iOS evidence at their original source.

The separately installed checkout validated d45a6e15 plus this exact patch: 247 focused tests, all 524 mobile tests and full pnpm check pass. The committed patch bytes were verified identical. No failed validation, new test expectation relaxation, runtime changes or native reruns occurred in this follow-up. Raw local paths/state/logs are omitted. Version-pinned source links support the proof; checksums pin the selected records.

The archived original unified patch is byte-exact. Its blank context markers can produce whitespace warnings when the patch itself is added as a text artifact; the tested source is unchanged.
