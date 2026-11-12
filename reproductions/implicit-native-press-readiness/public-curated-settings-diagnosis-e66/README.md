# Settings wrong-row diagnosis at e66

This bundle preserves the requested exact eec/e66 comparison, supplementary main/merge controls, and a deterministic native regression. All local runs use iOS 27.0; hosted failing CI uses iOS 26.2 with build SDK 26.5. Runtime parity is not claimed.

Exact eec passes first attempt with unobservable post-open observation. Exact e66 first fails after observable launch: it taps (201,319) and reaches the wrong page. Its unchanged existing retry passes unobservably at (201,406). The recovered overall CLI success is not evidence of correctness. Supplementary main/merge controls also pass unobservably. A passing observable baseline remains unestablished.

The existing hosted artifact shows attempts 2/3 matching an anonymous Cell at (16,293.3,370,52), now containing the setup banner, while General has moved to (16,380.3,370,52). The actual tap remains (201,319). Attempt 1 has a different pre-dispatch tree, so its exact reflow time is unknown. Readiness command success and dispatch are logged; the full original per-request descriptor and reply state are not reconstructed. The selected timeline retains one-based original line references, nearest preceding native timestamps, and original archive/log hashes. It omits process/session identities and unrelated UI.

The native regression is e66 production plus the included two-file test/fixture-only patch. It changes only a child label while the anonymous parent raw label/identifier/frame and hittability remain unchanged. Old code returns ready and fails the intended assertion. This proves the native synthesized-label binding hole; it does not prove the separate GuestAX row-title path fixed. The failed original test expected missing; a later typed semantic-change contract must retain this historical expectation honestly.

All five original distinct videos are retained unchanged, fully decoded (1,559 samples, zero decode errors), with first/last frames reviewed. They contain only default simulator Settings and a generic UIKit fixture. Each has one video track, no audio or AV metadata, and the standard 42-byte screenrecording policy tag. No private app was used. Original private logs, device/host identities, configuration and state are excluded. Public source copies disclose redactions and retain original/public SHA256 separately. Full runtime/native/source pins are selected without copying host paths.

This is diagnosis evidence, not a fixed-head acceptance claim. Existing proof and failed attempts remain at their actual sources. The idle-readiness and size exceptions still require explicit maintainer disposition.

The archived original unified patch is byte-exact. Its four blank context lines retain the required leading context marker; `git diff --cached --check` reports those four preserved patch-content lines as trailing spaces. Production source is not reformatted in this evidence-only commit.
