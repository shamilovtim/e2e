# Controlled failure excerpts

Actual base runtime with the strengthened owned-deadline case:

```text
1 failed, 1 passed, 19 filtered
Blocked response, real abort ordering, and zero input assertions passed first.
Expected readiness: blocked
Received readiness: native-read-failed
reason: target_not_ready
dispatched: no
```

Fixed runtime with only the owned-reason identity comparison removed:

```text
1 failed, 20 filtered
Earlier caller abort, delayed throw after owned expiry, and zero input assertions passed first.
Expected readiness: native-read-failed
Received readiness: blocked
reason: target_not_ready
dispatched: no
```

Restoring the fixed runtime passed both focused rows and all 21 readiness tests. Targeted V8 coverage passed 49 tests across readiness and binding files.
