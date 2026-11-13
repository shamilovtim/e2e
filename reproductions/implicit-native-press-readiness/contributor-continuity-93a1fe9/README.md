# Verified contributor-continuity checkpoint

This is the exact local candidate **93a1fe9**, based on **b7ded9c**, plus its isolated negative control **d81e716**. It is a historical checkpoint; it is not the current public PR branch and is not evidence for any later rebase.

The source patch recreates the recorded candidate tree. The exact local gate passed 19,633 unit tests (three existing skips) and 410 related tests. GitHub-only checks are explicitly skipped in the receipt, not claimed passed.

Native verification passed eleven selected methods. Omitting only live contributor label/ID comparison made two methods fail at three intended assertions; restoring the original products made both pass. These are selected native methods, not a full native suite.

Six real GuestAX cases passed. Saved references observe contributor change, one canonical refresh and an unsent refusal; fresh selectors instead establish ordinary selector-not-found without input. Ten lifecycle, motion and initial-idle cases passed across selectors and references. Cancellation retains the public unknown-dispatch classification, with separately observed zero input. The unchanged Settings replay passed on its first attempt, but its post-open timing was unobservable; it does not establish parity with the earlier hosted failure.

All 24 recordings are included, including four failed GuestAX setup/oracle attempts and the intentional native negative control. Their original failed outcomes remain visible. Every case links the actual source, native products, wrapper version and recording. See selected/CASE-INDEX.json and selected/README.md for qualifications and source redactions.

All recordings fully decoded: 6,954 video samples, zero decoder errors. Containers contain one video track, no audio, no AV metadata and only the standard screen-recording policy tag. First and last frames were visually reviewed; this is not a claim that every intermediate frame was manually inspected.

The candidate still needs maintainer decisions on the proposed idle-readiness and size exceptions. GitHub currently blocks the source-branch push because newer upstream commits contain workflow changes outside the token's scope. A separate integration onto cc3b99b is being verified; this checkpoint does not claim that work complete.
