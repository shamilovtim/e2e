# Commands

The same `native-probe.mjs` was used for all three cases. The only case inputs were the mobile build path/head, output directory, and whether engine recording was enabled. `SDK_ENTRY` named a clean source965 build. Matching native source fingerprint was a55f494d33fd59f188ce6e7d8734aabf83d3491042f52bb448d8815031facca3; the native binary SHA256 was 379ea9c40596308d7ad04f03753cf39725dff82588c9d72140ae8ff853ee2b15. The original constructed UIKit fixture source is included unchanged.

```sh
PROBE_ROOT="$OUTPUT" PROBE_DEVICE="$OWNED_SIMULATOR" MOBILE_ROOT="$MOBILE_BUILD" MOBILE_HEAD="$MOBILE_COMMIT" SDK_ENTRY="$SDK_SOURCE/dist/src/index.js" NATIVE_DERIVED="$SDK_NATIVE" NATIVE_XCTESTRUN="$SDK_XCTESTRUN" ENGINE_RECORDING="$RECORDING" node native-probe.mjs
```

Main used mobile d8b694ffa48b04c94d70a11cc280267f1ea9a100; fixed used c282cf9099c907adf581872d0cf57e74b70719ac. Recording-off used an external recording only for evidence; the mobile engine did not own a recording. Recording-on used the engine's actual startVideo/stopVideo path.

Before switching cases, each case's own daemon was stopped with `daemon stop --state-dir "$OWNED_STATE" --clean`. The fresh owned simulator was shut down and deleted after the cases. No shared daemon, unrelated simulator, or application was changed.
