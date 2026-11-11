# Mobile cancellation: reference note correction

[PR #1685](https://github.com/e2e-inc/e2e/pull/1685) is now at `ac80493b14d137628782d72aca07fcc4fb8b32e6`. This follow-up changes only the mobile reference note that previously said agent-device accepts no abort signal. The note now matches the guide: pending tap, double tap, focus and check requests receive timeout/interruption cancellation; input already sent to the device may still finish. Other commands can outlive the caller timeout, and the next attempt waits for their SDK requests to settle.

The runtime source tree is byte-identical to prior `9dc33e8`. [The validation receipt](validation.json) records all five passing documentation checks and the source-tree comparison. [The full source patch](mobile-cancellation.patch) retains the actual PR base and final head. No new native run was needed for a reference-only edit.

[Accepted-input native evidence](../accepted-press-review-9dc33e8/README.md) and [matched timeout/cancellation evidence](../mobile-review-c282cf9/README.md) keep their original source attribution. This append contains generic upstream code and documentation only, with no private application data or raw diagnostics. GitHub CI and maintainer review remain separate from this local documentation receipt.
