# Android request ordering source proof

The inspected release ref is official `v0.21.36`, commit `ebbaff9a6be75babdb4adcb9074d7522a2773330`. Current upstream was independently inspected at `b7ded9cfb26927c7c60d3a04272b62ef7d47da92` (`0.21.37`). This is source evidence for the supported daemon path, not an Android native run.

## Accepted Android tap lifetime

- The [Android interactor](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/src/core/interactors/android.ts#L82-L87>) calls `pressAndroid` without the request signal, as the reviewer observed.
- [pressAndroid](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/platform-android/src/input-actions.ts#L42-L62>) awaits either the automation helper or its ADB input fallback. The helper is not detached from this promise.
- [Generic press dispatch](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/contracts/src/touch-runtime.ts#L252-L293>) awaits each tap and double-tap backend operation. The [daemon touch executor](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/daemon/src/core/touch-runtime.ts#L242-L281>) awaits that bound operation. The interaction runtime also awaits the backend directly; it does not race an admitted Android tap against abort.

## Lock ownership

- Existing sessions select [both session and device keys](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/daemon/src/server/request-binding.ts#L18-L61>), so the next app relaunch queues behind the same keys.
- [runLocked](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/daemon/src/server/request-execution-scope.ts#L492-L503>) runs the request through [createRequestExecutionLocks](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/daemon/src/server/request-execution-locks.ts#L30-L50>), whose callback awaits the request task under those locks.
- [acquireKeyedLock](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/kernel/src/keyed-lock.ts#L126-L149>) sets `entered` before running its task. Its abort handler rejects only before entry. After admission it resolves or rejects from task completion; the lock-map entry is removed by that completion, not by abort.
- The outer [request deadline wrapper](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/host-kit/src/internal/request-cancel.ts#L215-L248>) also awaits its task. Deadline expiry aborts its signal but does not replace the task with an abort race.
- The existing upstream [admitted-abort regression test](<https://github.com/callstack/agent-device/blob/ebbaff9a6be75babdb4adcb9074d7522a2773330/packages/kernel/src/keyed-lock.test.ts#L41-L70>) asserts that abort after admission does not settle the running lock task. It was inspected, not rerun in this light phase.

Consequently, cancelling the client press promise does not release an admitted local Android request's session/device locks while its tap promise remains pending. The next relaunch waits for that promise to finish. This explains Android ordering without relying on the iOS-only fix in #3385.

The critical keyed-lock implementation, lock wrapper, admitted runLocked callback, existing-session key selection, tapPoint binding, Android interactor, input helper, and request-deadline task wrapper are unchanged at the inspected current upstream commit. The installed published 0.21.36 `dist/src/keyed-lock.js` was separately inspected and contains the same entered-only abort rule.

This preserves the existing bounded qualification: completion of an SDK/native backend promise is not a universal native termination certificate. Backend deadlines, failures or arbitrary custom transports are not new Android native evidence. The prior UIKit probes remain iOS evidence.

## Validation state

The separately installed e2e checkout verified the exact five-file patch applied to d45a6e15: 247 focused tests in three files, all 524 mobile tests in 21 files, full repository checks and mobile/workspace type checks pass. Commit 66957b62067bfd5cb02b1b5abc4c1885e1df3f6c contains byte-identical reviewed changes; no production mobile or SDK source changes. The existing SDK keyed-lock regression is cited as source, not claimed as rerun. No Android native run or new recording was performed; the review explicitly allowed a source-code proof. Earlier UIKit recordings retain their original sources.
