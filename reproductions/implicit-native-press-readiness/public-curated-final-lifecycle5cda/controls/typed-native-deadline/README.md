# Typed native deadline classification

This follow-up fixes a confirmed local Apple runner transport path at source `95223a0d77987f68ed99c9ae2d4e54a8ef80607c`. The isolated patch SHA256 is `57ebe08e98e2ee696133bfdf998cc1be8f06afe77a4359f9860a987c1c805647`. It changes two existing TypeScript files; production adds the existing cancellation predicate and narrows one catch condition.

The readiness owner passes its deadline signal into the native read. `pressReadiness` is read-only, so even an already-ready runner routes through `waitForRunner`. That transport wraps an aborted POST as canonical `request_canceled`. The readiness catch previously skipped every typed AppError, losing the last blocked state when its own timer expired during the native read. This local route does not require `awaitWithSignal`; see exact committed-source excerpts in source-trace.json.

The fix re-enters the existing budget owner for canonical cancellation errors when the actual effective signal is aborted. The owner reads the signal's winning reason: its own timer preserves the blocked state, while an earlier caller abort remains cancellation. Other typed backend failures retain their original code, message and details. The successful readiness, polling, native and dispatch paths are unchanged.

The six focused controls pass. Restoring only actual952 runtime fails the canonical typed-owned case after blocked-read, real-abort, native-rejection-marker and zero-input preconditions pass; the other five controls pass. Removing only the canonical-cancellation predicate fails the unrelated typed-error case; the other five pass. Restoration passes all 23 readiness tests and 51 targeted owner tests. Types, lint, full format, Fallow and diff checks pass. Coverage thresholds are unchanged; targeted coverage is not full CI coverage.

The separate real native source952 diagnostic corroborates the bug: its default 60-second result deadline returned `request_canceled`, missing the blocked state, after 635 completed readiness reads. No target tap was accepted. After explicit overlay release and observed fade completion plus grace, underlying and overlay counters both stayed zero. Its strict classification oracle failed; input safety, cleanup and recording succeeded. That recording remains source952 evidence, not a final-patch live run.

Final committed-source validation, current-source native cases and publication have separate provenance. This folder contains the isolated patch, controls, source trace and unchanged public summary of the old native failure.
