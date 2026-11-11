### 🔴 e2e: 3 failed

**🔴 UIKit fade 750ms**  
`tests/overlay.e2e.ts:14`

**ASSERTION_FAILED** at step 5 of 5: `expect.toHaveText getByTestId("results")`, after 5.0s

- Expected: text "Underlying taps: 1\\nOverlay touches: 0"
- Observed: text "Underlying taps: 0 Overlay touches: 1" (1 match)
- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `evidence/main-2000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/attempt-1/screenshots/001-failure.png`, video `evidence/main-2000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/attempt-1/video/video.mp4`, log `evidence/main-2000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/attempt-1/screen-at-failure.txt` · Trace: `evidence/main-2000/results/overlay-uikit-fade-750ms-96e13e53b3b43ced/trace.md`

**🔴 UIKit fade 750ms (repeat #1)**  
`tests/overlay.e2e.ts:14`

**ASSERTION_FAILED** at step 5 of 5: `expect.toHaveText getByTestId("results")`, after 5.0s

- Expected: text "Underlying taps: 1\\nOverlay touches: 0"
- Observed: text "Underlying taps: 0 Overlay touches: 1" (1 match)
- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `evidence/main-2000/results/overlay-uikit-fade-750ms-21c667c38297dcd0/attempt-1/screenshots/001-failure.png`, video `evidence/main-2000/results/overlay-uikit-fade-750ms-21c667c38297dcd0/attempt-1/video/video.mp4`, log `evidence/main-2000/results/overlay-uikit-fade-750ms-21c667c38297dcd0/attempt-1/screen-at-failure.txt` · Trace: `evidence/main-2000/results/overlay-uikit-fade-750ms-21c667c38297dcd0/trace.md`

**🔴 UIKit fade 750ms (repeat #2)**  
`tests/overlay.e2e.ts:14`

**ASSERTION_FAILED** at step 5 of 5: `expect.toHaveText getByTestId("results")`, after 5.0s

- Expected: text "Underlying taps: 1\\nOverlay touches: 0"
- Observed: text "Underlying taps: 0 Overlay touches: 1" (1 match)
- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `evidence/main-2000/results/overlay-uikit-fade-750ms-4b8a8a661670c5f1/attempt-1/screenshots/001-failure.png`, video `evidence/main-2000/results/overlay-uikit-fade-750ms-4b8a8a661670c5f1/attempt-1/video/video.mp4`, log `evidence/main-2000/results/overlay-uikit-fade-750ms-4b8a8a661670c5f1/attempt-1/screen-at-failure.txt` · Trace: `evidence/main-2000/results/overlay-uikit-fade-750ms-4b8a8a661670c5f1/trace.md`

**Repeats:** 0 of 1 test passed all 3 runs

- ⚠️ `tests/overlay.e2e.ts` UIKit fade 750ms: 0/3 passed · repeat 0 ASSERTION_FAILED · repeat 1 ASSERTION_FAILED · repeat 2 ASSERTION_FAILED

<details>
<summary>All 3 tests in 1 file</summary>

|  | Test | Time |
| --- | --- | --- |
| 🔴 | **tests/overlay.e2e.ts** · 3 failed | 42.3s |
| 🔴 | UIKit fade 750ms | 14.2s |
| 🔴 | UIKit fade 750ms (repeat #1) | 14.0s |
| 🔴 | UIKit fade 750ms (repeat #2) | 14.1s |
</details>

<sub>Tested by [e2e](https://e2e.com) 0.23.0 · 42.4s · ios-main</sub>
