# Keyboard dismissal without an on-screen keyboard

This is a controlled reproduction at the mobile adapter's SDK boundary. It uses
the built runner and adapter with a scripted agent-device client. No simulator,
native app, credentials, or model is used.

The two targets report an absent keyboard, or a visible keyboard whose frame is
entirely below its 852-point viewport. The scripted client changes the displayed
form text only if the adapter sends a native keyboard command. This makes the
unwanted dispatch observable without relying on a native producer to repeat the
historical stale-frame condition.

```sh
pnpm install --frozen-lockfile
pnpm --filter e2e build
pnpm --filter @e2e-dev/mobile build
cd packages/mobile/tests/fixtures/keyboard-dismiss
node ../../../../e2e/dist/cli/bin.js run --config e2e.config.ts --workers 1 --retries 0
```

On unmodified main both cases send `command.keyboard`, change the form, and fail.
With the dismissal guard, both cases pass and the form stays unchanged. The
fixture does not establish that a current native producer still emits the stale
frame or changes a real form during dismissal.
