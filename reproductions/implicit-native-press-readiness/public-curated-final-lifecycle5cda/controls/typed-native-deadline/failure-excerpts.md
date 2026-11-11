# Negative controls

Both controls use the same focused command as the passing candidate. Their blocked-read, actual abort-order, native-boundary rejection marker and zero-input assertions pass before the error matcher.

## Only actual952 runtime restored

```text
FAIL a production result deadline preserves the last blocked native state after canceled native abort
Expected: target_not_ready, readiness blocked, dispatched no
Received: request_canceled, dispatched no
Tests 1 failed | 5 passed | 17 filtered
```

The raw-owned deadline, generic caller, typed request cancellation, raw transport failure and unrelated typed-error controls pass.

## Only the canonical-cancellation predicate omitted

```text
FAIL an unrelated typed native failure survives an owned budget abort
Expected: native-transport-failed, backendCode1234, dispatched no
Received: target_not_ready, dispatched no
Tests 1 failed | 5 passed | 17 filtered
```

The unrelated backend's code and message also remain asserted. Restoring the narrow predicate passes all 23 readiness tests and 51 targeted owner cases. Raw logs stay local; these excerpts omit incidental runtime details.
