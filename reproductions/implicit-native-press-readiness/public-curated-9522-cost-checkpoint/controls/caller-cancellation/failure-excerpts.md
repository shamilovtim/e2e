# Regression excerpts

Both negative controls run the same focused command as the passing candidate. In each failure, the observable blocked-read, abort-order and zero-input assertions complete before the error matcher.

## Actual source7395 runtime with the strengthened caller scenario

```text
FAIL callerAbort cannot fall through to dispatch
Expected details: dispatched no, reason request_canceled
Received details: dispatched no, reason target_not_ready
Tests 1 failed | 1 passed | 19 filtered
```

The owned result-deadline scenario passes. The caller scenario explicitly advances wall time past the absolute cutoff after its delayed throw.

## Only the caller/owned reason inequality removed

```text
FAIL a production result deadline preserves the last blocked native state
Expected details: dispatched no, reason target_not_ready, readiness blocked
Received details: dispatched no, reason request_canceled
Tests 1 failed | 1 passed | 19 filtered
```

The caller scenario passes. Restoring the exact patch then passes all 21 readiness cases and 49 targeted owner cases. Full raw logs remain local; these excerpts omit local paths and incidental runtime details.
