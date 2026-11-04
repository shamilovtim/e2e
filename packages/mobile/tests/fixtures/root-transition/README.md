# Screen scroll after alert dismissal

This controlled reproduction runs the built CLI and mobile adapter against a
scripted agent-device client. It uses no simulator, native app, credentials, or
model. The client exposes a readable screen throughout, but ignores screen
scrolls for the configured transition budget after dismissing an alert.

```sh
pnpm install --frozen-lockfile
pnpm --filter e2e build
pnpm --filter @e2e-dev/mobile build
cd packages/mobile/tests/fixtures/root-transition
node ../../../../e2e/dist/cli/bin.js run --config e2e.config.ts --workers 1 --retries 0
```

On unmodified main the scroll arrives during the modeled dismissal and the
assertion fails. With the root-swipe transition fix, it arrives after the budget
and the assertion passes. This proves the adapter command timing, not native
animation behavior or a benchmark performance claim.
