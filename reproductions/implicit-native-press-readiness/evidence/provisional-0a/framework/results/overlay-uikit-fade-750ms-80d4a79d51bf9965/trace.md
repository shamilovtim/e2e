# ✓ UIKit fade 750ms

`tests/overlay.e2e.ts` · passed · 7.4s

Ran on: platform `ios` · device `<run-or-owned-device-id>`

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (1.7s, video 0:00) — `tests/overlay.e2e.ts:10`
2. ✓ `locator.tap` `getByRole("button", name: "Open fade overlay")` (1.5s, video 0:01) — `tests/overlay.e2e.ts:11`
   - tap button "Open fade overlay" (1.5s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `locator.tap` `getByRole("button", name: "Close overlay")` (1.5s, video 0:03) — `tests/overlay.e2e.ts:12`
   - tap button "Close overlay" (1.5s)
   - screen: 3 changes since step 2 at `dev.e2e.overlay1563`, 15 nodes
     - `added text "Fade duration: 0.75 s"`
     - `added button "Close overlay" testid="Close overlay"`
     - `added text "Close overlay"`
4. ✓ `locator.tap` `getByRole("button", name: "Underlying action")` (885ms, video 0:04) — `tests/overlay.e2e.ts:13`
   - tap button "Underlying action" (885ms)
   - screen: 3 changes since step 3 at `dev.e2e.overlay1563`, 12 nodes
     - `removed text "Fade duration: 0.75 s"`
     - `removed button "Close overlay" testid="Close overlay"`
     - `removed text "Close overlay"`
5. ✓ `expect.toHaveText` `getByTestId("results")` (53ms, video 0:05) — `tests/overlay.e2e.ts:14`
   - screen: 2 changes since step 4 at `dev.e2e.overlay1563`, 12 nodes
     - `added text "Underlying taps: 1\nOverlay touches: 0" text="Underlying taps: 1 Overlay touches: 0" testid="results"`
     - `removed text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`

## Evidence

- [video](attempt-1/video/video.mp4) `e2e-final/results/overlay-uikit-fade-750ms-80d4a79d51bf9965/attempt-1/video/video.mp4`

<sub>e2e 0.23.0 · run `<run-or-owned-device-id>` · the whole run is in `report.json`</sub>
