# ✓ the immediately following attempt receives only its own input

`tests/next-attempt.e2e.ts` · passed · 6.4s

Ran on: platform `ios` · device `<owned-simulator>`

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (2.7s, video 0:00) — `tests/next-attempt.e2e.ts:13`
2. ✓ `locator.tap` `getByRole("button", name: "Underlying action")` (1.6s, video 0:02) — `tests/next-attempt.e2e.ts:14`
   - tap button "Underlying action" (1.6s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `expect.toHaveText` `getByTestId("results")` (45ms, video 0:04) — `tests/next-attempt.e2e.ts:15`
   - screen: 2 changes since step 2 at `dev.e2e.overlay1563`, 12 nodes
     - `added text "Underlying taps: 1\nOverlay touches: 0" text="Underlying taps: 1 Overlay touches: 0" testid="results"`
     - `removed text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`

## Evidence

- [video](video.mp4) `runner-proof/results/next-attempt-the-immediately-following-f247800e925a3db8/video.mp4`

<sub>e2e 0.23.0 · run `01a1c8fe-2d57-7335-a750-65f0f2673eda` · the whole run is in `report.json`</sub>
