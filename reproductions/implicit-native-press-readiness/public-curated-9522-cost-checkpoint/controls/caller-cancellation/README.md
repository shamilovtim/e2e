# Controlled caller cancellation

This source-only follow-up addresses the [review finding](https://github.com/callstack/agent-device/pull/4391#discussion_r4543915730) at SDK source `7395df404597e9e40f80a778149faabfe390847a`. The patch SHA256 is `70bc75cb21f4c37d41c175be3ac95440cd8ca08c10590cbcc40b9e0a64014ac3`. It changes two existing TypeScript files and adds no test cases.

A generic caller abort in the direct in-process runtime was classified as a native read failure, or as target readiness when its delayed read unwound after the absolute deadline. The existing budget owner now preserves typed errors, maps the caller's winning abort reason through the canonical cancellation factory, and retains the last native state for its own deadline. Input remains undispatched. The successful readiness, polling, native, and dispatch paths are unchanged. The existing SDK RPC cancellation path already returned typed cancellation and is a separate scope.

The existing caller scenario establishes a blocked read and an actual earlier caller abort, delays the backend throw until the owned timer has also elapsed, crosses the absolute cutoff, and checks zero input before matching `request_canceled`. The owned-deadline scenario retains its real 150 ms production timer with wall time one tick before cutoff.

Restoring only the actual pre-fix runtime fails the caller oracle. Removing only the reason inequality fails the owned-deadline oracle. Restoration passes all 21 readiness tests and 49 targeted coverage tests. The configured coverage thresholds are unchanged. Targeted coverage is not full CI coverage. See the JSON receipts and source patch.

The parent source7395 had terminal GitHub checks: 14 success and two skipped. Cubic completed an actual review and raised this finding. These local controls are attributed to source7395 plus this exact patch. Final-commit validation and live recordings have separate provenance; this folder makes no new native execution claim.
