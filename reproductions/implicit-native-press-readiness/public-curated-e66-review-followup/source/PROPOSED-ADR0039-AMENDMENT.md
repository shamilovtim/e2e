Proposed ADR 0039 amendment — pending explicit maintainer acceptance

This changes the accepted idle-cost exception. It is proposed text, not an assertion that the existing decision has been amended or accepted. The other one-owner, generation, budget and dispatch rules remain in force.

Replace **Cost** with:

> **Cost.** Motion screening uses the prior mutation baseline and adds no capture, probe or sleep when it passes. A path that declares no live-readiness check keeps that zero-read accept path.
>
> Ordinary primary iOS presses and clicks resolved by the runtime declare native readiness when unknown. Capture-time geometric hittability and motion screening do not establish current native hittability. These paths therefore add one native readiness read even when motion screening passes. Only an equivalent current authoritative readiness fact can replace that read; current geometric capture facts are not equivalent. If that read is ready, admission adds no further capture or sleep. If it is blocked, the existing admission loop polls the native fact alone; a later ready result requires fresh canonical resolution and native proof for that generation before dispatch. The original request budget and cancellation signal bound all reads and waits.

Replace the timer-overlay paragraph under **Consequences and open gaps** with:

> A natively blocked control can have the same capture geometry and motion history as a ready control, including a control covered by an app timer without a prior mutation. The ordinary iOS primary-tap paths spend a live read to distinguish them. Motion-idle presses on those paths therefore incur a native round trip; the zero-read cost rule remains for paths that declare no live-readiness check. Native hittability is a prerequisite for fully blocked controls, not proof that the selected point is free of a partial custom cover.

Keep the existing partial-cover/trajectory gap paragraph. Measurements remain in the issue's immutable evidence, not the ADR. The current warm 500-control measurements are descriptive baseline-before-head pairs; they are not evidence of a first idle press with no prior mutation. That requested live case remains separate.
