### 🔴 e2e: 2 failed, 1 passed

**🔴 UIKit fade 750ms**  
`tests/overlay.e2e.ts:14`

**ASSERTION_FAILED** at step 5 of 5: `expect.toHaveText getByTestId("results")`, after 5.0s

- Expected: text "Underlying taps: 1\\nOverlay touches: 0"
- Observed: text "Underlying taps: 0 Overlay touches: 1" (1 match)
- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `evidence/main-1000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/attempt-1/screenshots/001-failure.png`, video `evidence/main-1000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/attempt-1/video/video.mp4`, log `evidence/main-1000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/attempt-1/screen-at-failure.txt` · Trace: `evidence/main-1000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/trace.md`

**🔴 UIKit fade 3000ms diagnostic**  
`tests/overlay.e2e.ts:14`

**ASSERTION_FAILED** at step 5 of 5: `expect.toHaveText getByTestId("results")`, after 5.0s

- Expected: text "Underlying taps: 1\\nOverlay touches: 0"
- Observed: text "Underlying taps: 0 Overlay touches: 1" (1 match)
- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/attempt-1/screenshots/001-failure.png`, video `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/attempt-1/video/video.mp4`, log `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/attempt-1/screen-at-failure.txt` · Trace: `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/trace.md`

<details>
<summary>All 3 tests in 1 file</summary>

|  | Test | Time |
| --- | --- | --- |
| 🔴 | **tests/overlay.e2e.ts** · 2 failed, 1 passed | 32.7s |
| 🔴 | UIKit fade 750ms | 12.6s |
| 🔴 | UIKit fade 3000ms diagnostic | 12.3s |
| 🟢 | UIKit page sheet control | 7.8s |
</details>

<sub>Tested by [e2e](https://e2e.com) 0.23.0 · 32.8s · ios-main</sub>
