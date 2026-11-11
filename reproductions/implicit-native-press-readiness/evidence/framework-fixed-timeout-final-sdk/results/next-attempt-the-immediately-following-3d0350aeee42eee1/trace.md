# ✓ the immediately following attempt receives only its own input

`tests/next-attempt.e2e.ts` · passed · 4.6s

Ran on: platform `ios` · device `<run-or-owned-device-id>`

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (1.6s, video 0:00) — `tests/next-attempt.e2e.ts:13`
2. ✓ `locator.tap` `getByRole("button", name: "Underlying action")` (1.5s, video 0:01) — `tests/next-attempt.e2e.ts:14`
   - tap button "Underlying action" (1.5s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `expect.toHaveText` `getByTestId("results")` (46ms, video 0:03) — `tests/next-attempt.e2e.ts:15`
   - screen: 2 changes since step 2 at `dev.e2e.overlay1563`, 12 nodes
     - `added text "Underlying taps: 1\nOverlay touches: 0" text="Underlying taps: 1 Overlay touches: 0" testid="results"`
     - `removed text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`

## Evidence

- [video](attempt-1/video/video.mp4) `final-native/results/next-attempt-the-immediately-following-3d0350aeee42eee1/attempt-1/video/video.mp4`

<sub>e2e 0.23.0 · run `<run-or-owned-device-id>` · the whole run is in `report.json`</sub>
