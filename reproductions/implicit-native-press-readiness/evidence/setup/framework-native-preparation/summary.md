### 🔴 e2e: 3 failed

**🔴 UIKit fade 750ms**  
`mobile/dist/errors.js:206`

**ENGINE_FAILURE** at step 2 of 2: `locator.tap getByRole("button", name: "Open fade overlay")`, after 1.2s

> perform tap failed: Refusing to clean AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH automatically Hint: Unset AGENT_DEVICE_IOS_CLEAN_DERIVED, or move AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH under a subdirectory of <verification-root>/.tmp.

- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `e2e-candidate/results/overlay-uikit-fade-750ms-80d4a79d51bf9965/attempt-1/screenshots/001-failure.png`, video `e2e-candidate/results/overlay-uikit-fade-750ms-80d4a79d51bf9965/attempt-1/video/video.mp4`, log `e2e-candidate/results/overlay-uikit-fade-750ms-80d4a79d51bf9965/attempt-1/screen-at-failure.txt` · Trace: `e2e-candidate/results/overlay-uikit-fade-750ms-80d4a79d51bf9965/trace.md`

**🔴 UIKit fade 3000ms diagnostic**  
`mobile/dist/errors.js:206`

**ENGINE_FAILURE** at step 2 of 2: `locator.tap getByRole("button", name: "Open slow fade overlay")`, after 1.1s

> perform tap failed: Refusing to clean AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH automatically Hint: Unset AGENT_DEVICE_IOS_CLEAN_DERIVED, or move AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH under a subdirectory of <verification-root>/.tmp.

- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `e2e-candidate/results/overlay-uikit-fade-3000ms-diagnostic-ec85f5bff84fb714/attempt-1/screenshots/001-failure.png`, video `e2e-candidate/results/overlay-uikit-fade-3000ms-diagnostic-ec85f5bff84fb714/attempt-1/video/video.mp4`, log `e2e-candidate/results/overlay-uikit-fade-3000ms-diagnostic-ec85f5bff84fb714/attempt-1/screen-at-failure.txt` · Trace: `e2e-candidate/results/overlay-uikit-fade-3000ms-diagnostic-ec85f5bff84fb714/trace.md`

**🔴 UIKit page sheet control**  
`mobile/dist/errors.js:206`

**ENGINE_FAILURE** at step 2 of 2: `locator.tap getByRole("button", name: "Open native sheet")`, after 1.1s

> perform tap failed: Refusing to clean AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH automatically Hint: Unset AGENT_DEVICE_IOS_CLEAN_DERIVED, or move AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH under a subdirectory of <verification-root>/.tmp.

- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `e2e-candidate/results/overlay-uikit-page-sheet-control-1f80526e2b69fd22/attempt-1/screenshots/001-failure.png`, video `e2e-candidate/results/overlay-uikit-page-sheet-control-1f80526e2b69fd22/attempt-1/video/video.mp4`, log `e2e-candidate/results/overlay-uikit-page-sheet-control-1f80526e2b69fd22/attempt-1/screen-at-failure.txt` · Trace: `e2e-candidate/results/overlay-uikit-page-sheet-control-1f80526e2b69fd22/trace.md`

<details>
<summary>All 3 tests in 1 file</summary>

|  | Test | Time |
| --- | --- | --- |
| 🔴 | **tests/overlay.e2e.ts** · 3 failed | 13.8s |
| 🔴 | UIKit fade 750ms | 5.0s |
| 🔴 | UIKit fade 3000ms diagnostic | 4.4s |
| 🔴 | UIKit page sheet control | 4.4s |
</details>

<sub>Tested by [e2e](https://e2e.com) 0.23.0 · 14.0s · ios-candidate</sub>
