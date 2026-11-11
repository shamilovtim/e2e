### 🔴 e2e: 1 failed

**🔴 short action timeout during native overlay dismissal**  
`mobile/dist/support.js:75`

**ACTION_FAILED** at step 4 of 4: `locator.tap getByRole("button", name: "Underlying action")`, after 501ms

> tap timed out before the device answered; its input may have been dispatched: getByRole("button", name: "Underlying action")

- Screen: `dev.e2e.overlay1563`

Evidence: screenshot `e2e-timeout/results/timeout-short-action-timeout-during-ca5b231a9f10da20/attempt-1/screenshots/001-failure.png`, video `e2e-timeout/results/timeout-short-action-timeout-during-ca5b231a9f10da20/attempt-1/video/video.mp4`, log `e2e-timeout/results/timeout-short-action-timeout-during-ca5b231a9f10da20/attempt-1/screen-at-failure.txt` · Trace: `e2e-timeout/results/timeout-short-action-timeout-during-ca5b231a9f10da20/trace.md`

<details>
<summary>All 1 test in 1 file</summary>

|  | Test | Time |
| --- | --- | --- |
| 🔴 | **tests/timeout.e2e.ts** · 1 failed | 10.1s |
| 🔴 | short action timeout during native overlay dismissal | 10.1s |
</details>

<sub>Tested by [e2e](https://e2e.com) 0.23.0 · 10.3s · ios-candidate</sub>
