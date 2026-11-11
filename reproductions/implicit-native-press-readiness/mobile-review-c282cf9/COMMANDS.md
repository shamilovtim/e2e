# Commands

Paths below are supplied build locations. No global SDK upgrade or application source change was used. `SDK_SOURCE` is a clean source965 build with the separately built matching native assets. `E2E_BASE` holds built CLI d8. Each framework project has an isolated mobile package copy whose SDK dependency points to `SDK_SOURCE`; main uses mobile d8 and fixed uses mobile c282. The two projects have distinct daemon state directories.

```sh
SDK_ENTRY="$SDK_SOURCE/dist/src/index.js" NATIVE_DERIVED="$SDK_NATIVE" NATIVE_XCTESTRUN="$SDK_XCTESTRUN" OVERLAY_DEVICE="$OWNED_SIMULATOR" ACCEPTANCE_ROOT="$SDK_OUTPUT" ACCEPTANCE_CASE=fade750-1 node sdk-acceptance.mjs
```

```sh
ACCEPTANCE_DEVICE="$OWNED_SIMULATOR" ACCEPTANCE_STATE="$OWNED_STATE" NATIVE_DERIVED="$SDK_NATIVE" NATIVE_XCTESTRUN="$SDK_XCTESTRUN" node "$E2E_BASE/packages/e2e/dist/cli/bin.js" run --video on --trace on --output runner-proof
```

The main comparison contains only `tests/timeout-observe.e2e.ts`. The fixed project also contains `tests/next-attempt.e2e.ts`. Before switching projects, the prior project's owned daemon was stopped with `daemon stop --clean`. Videos were decoded at their actual first/final sample timestamps with zero requested tolerance using the included validator.
