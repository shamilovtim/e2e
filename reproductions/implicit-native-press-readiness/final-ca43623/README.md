# Implicit native press readiness: final review evidence

All app source, screenshots, videos and native event logs in this append come from standalone generic UIKit fixtures. The source patch contains only generic upstream framework code. No private application data, account, backend address, daemon state, lease, token or whole diagnostic archive is included.

The final source is `ca43623c9a17e54ac9fb1d006581021c7d8f1363`. Ordinary primary selector/ref `press` and `click` calls use the admitted native readiness operation automatically. Only a matched, blocked control is polled; missing or ambiguous bindings refuse input. Strict identity, full normalized frame and actual app scope remain bound throughout. After a blocked wait, one fresh canonical capture validates the point before dispatch. No test-author wait API is added.

The final source also prevents an explicitly undispatched native failure from being converted into tap success merely because a later capture changed. The [dispatcher regression proof](checks/unsent-corroboration-proof.json) distinguishes that virtual-boundary test from live native evidence.

## Live results

| Case | Observed result |
|---|---|
| [500-control tree before query narrowing](native/evidence/head965-large/video.mp4) | Intermediate `965` was still enumerating at explicit caller cancellation after 15 s; no tap |
| [Same large tree after narrowing](native/evidence/head380-large/video.mp4) | All seven intended inputs arrived; warm ref median 800.51 ms versus 561.38 ms on source base `5a`, n=3 each |
| [Clipped row](native/evidence/head380-clipped/video.mp4) | Raw center lies outside the visible rectangle; native readiness is true and refs/selectors/CLI reach the intended row |
| [Clipped row with its visible tail fully covered](native/evidence/head380-clipped-overlay-cancel/video.mp4) | Native ready → blocked → ready; caller cancellation sends no observed input through fade removal and follow-up observation; fresh ref then works |
| [Identical same-frame duplicates](native/evidence/head380-exact-duplicates/video.mp4) | Strict ambiguity refuses input; no unrelated hittable duplicate authorizes the blocked target |
| [Placed iPad window](native/evidence/head380-ipad-placed-ref/video.mp4) | Public, retained and live frames agree; exactly one intended native action |
| [Final built SDK, 750 ms fade](native/final-bef-smoke/sdk-final/fade750-1/video.mp4) | Identical public d006 harness exits 0, intended control 1 / overlay 0; tap follows fade completion |

[The native manifest](native/MANIFEST.json) and [individual latency observations](native/LATENCY-SUMMARY.json) retain exact source/fingerprint attribution and limits. Matched performance and geometry cases ran at `380`; the final JavaScript smoke ran at `bef`. The final `ca43623` source differs from the live-smoke `bef` source only in a package test helper and the internal-operation test registry, with all 629 generated JavaScript files and native fingerprint unchanged from verified `bef`/`71f`; see [source attribution](checks/final-source-attribution.json). Small sequential timing samples are not a general performance guarantee.

Eight selected native tests passed on the final `71f` artifact; this is not a full native-suite claim. Nineteen valid videos decode, and all 55 included first/last frames and screenshots were visually audited; no full frame-by-frame playback claim is made. Public caller cancellation can report `dispatched:unknown`; native zero-input observations are not relabeled as public no-dispatch proof.

[The patch](patches/agent-device.patch), [source audit](checks/source-patch-audit.json) and [exact-commit validation receipt](checks/agent-device-exact-validation.json) accompany this append. Historical `a3` and `380` proofs remain explicitly attributed. The original upstream geometry limitation is tracked separately in [issue #4399](https://github.com/callstack/agent-device/issues/4399); general degraded placed-window support is not claimed.
