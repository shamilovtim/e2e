# Explicit synchronization after an overlay dismissal

This controlled reproduction uses the built CLI and mobile adapter with a
scripted agent-device client. It models a native picker whose accessibility
tree exposes the unchanged control beneath it before its dismissal animation
finishes. It does not reproduce or prove a current native producer's behavior.
No simulator, native app, credentials, or model is used.

Both controls keep the same identity, position, and keyboard state throughout.
Closing the overlay starts a 750 ms modeled dismissal; an input sent during it
is intercepted. The adapter's configured transition budget is 1,000 ms.

```sh
pnpm install --frozen-lockfile
pnpm --filter e2e build
pnpm --filter @e2e-dev/mobile build
cd packages/mobile/tests/fixtures/overlay-transition
node ../../../../e2e/dist/cli/bin.js run --config e2e.config.ts --workers 1 --retries 0
REPRO_WAIT_FOR_BUDGET=1 node ../../../../e2e/dist/cli/bin.js run --config e2e.config.ts --workers 1 --retries 0
```

The first run fails: unchanged-control immediacy sends the second tap while the
modeled overlay is fading. The comparison run passes after an explicit wait.
That fixed wait illustrates the missing synchronization point; it is not a
proposed framework implementation or a recommendation to add sleeps to tests.

The proposed `await device.waitForTransition()` would consume only the remainder
of the configured transition budget since the last action, within the caller's
timeout, while retaining today's default immediate-control policy. It would be
a bounded timing choice, not proof that a real animation has completed.
