# Press cancellation coverage

Source head: `d45a6e1551629f0f2dd165b739d6970a059febeb`.
Base: `e15c05852c35de4067f691d0776629fb207c4d0c`.

Only two test files changed. Production source and `dismissKeyboard(signal, input)` are unchanged. Verification used an independently installed checkout with Node 24.22.0, pnpm 12.3.4, and pinned agent-device 0.21.36. No native cancellation probe was repeated for this test-only follow-up.

## Positive verification

- The three existing command scenarios and new real-SDK device-fixture case: 4 passed in 2 files.
- `pnpm --filter @e2e-dev/mobile run test`: 524 passed in 21 files.
- `pnpm check`: exit 0, including lint, dead code, builds, workspace typechecks, documentation, package and manifest checks.

## Mutation verification

Each press-route mutation replaces only `input.press(client, options)` with `input.send(() => client.interactions.press(options))`, preserving its input budget while omitting the request signal. Each mutation ran alone and failed the new signal assertion. Production source was restored after every run.

| Route | Result | Failing assertion |
| --- | --- | --- |
| locator-tap | RED | `tests/unit/engine.test.ts:1345` |
| locator-focus | RED | `tests/unit/engine.test.ts:1345` |
| locator-double-tap | RED | `tests/unit/engine.test.ts:1345` |
| check-uncheck | RED | `tests/unit/engine.test.ts:1345` |
| key-field-focus | RED | `tests/unit/engine.test.ts:1345` |
| keyboard-tip-continue | RED | `tests/unit/engine.test.ts:1925` |
| pointer-tap | RED | `tests/unit/engine.test.ts:3446` |
| pointer-double-tap | RED | `tests/unit/engine.test.ts:3446` |

The device-fixture mutation changes only the budget's `signal: context.signal` to `signal: new AbortController().signal`; the outer signal stays intact. The real SDK transport holds the keyboard tip's Continue press until the caller has aborted, then resumes it.

```text
Fresh budget signal: FAIL at input-cancellation.test.ts:73
Expected delivered: 0
Actual delivered: 1
Exact source restored: 1 passed
```

The complete restored mobile suite and repository check pass. `source.patch` is the exact reviewed two-file change; `results.json` records the individual mutations and commands. This record captures local verification before source publication and makes no current-head remote CI claim.
