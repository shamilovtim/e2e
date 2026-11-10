# ✓ UIKit page sheet control

`tests/overlay.e2e.ts` · passed · 7.5s

Ran on: platform `ios` · device `CA371337-B1F1-4A84-91BB-0E2ACA90E3E2`

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (1.5s, video 0:00) — `tests/overlay.e2e.ts:10`
2. ✓ `locator.tap` `getByRole("button", name: "Open native sheet")` (1.6s, video 0:01) — `tests/overlay.e2e.ts:11`
   - tap button "Open native sheet" (1.6s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `locator.tap` `getByRole("button", name: "Close sheet")` (1.4s, video 0:03) — `tests/overlay.e2e.ts:12`
   - tap button "Close sheet" (1.4s)
   - screen: 12 changes since step 2 at `dev.e2e.overlay1563`, 4 nodes
     - `added button "Close sheet"`
     - `added text "Close sheet"`
     - `removed text "Overlay transition proof"`
     - `removed button "Open fade overlay" testid="Open fade overlay"`
     - `removed text "Open fade overlay"`
     - `removed button "Open slow fade overlay" testid="Open slow fade overlay"`
     - `removed text "Open slow fade overlay"`
     - `removed button "Open native sheet" testid="Open native sheet"`
     - `removed text "Open native sheet"`
     - `removed button "Underlying action" testid="Underlying action"`
     - `removed text "Underlying action"`
     - `removed text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`
4. ✓ `locator.tap` `getByRole("button", name: "Underlying action")` (1.4s, video 0:04) — `tests/overlay.e2e.ts:13`
   - tap button "Underlying action" (1.4s)
   - screen: 12 changes since step 3 at `dev.e2e.overlay1563`, 12 nodes
     - `added text "Overlay transition proof"`
     - `added button "Open fade overlay" testid="Open fade overlay"`
     - `added text "Open fade overlay"`
     - `added button "Open slow fade overlay" testid="Open slow fade overlay"`
     - `added text "Open slow fade overlay"`
     - `added button "Open native sheet" testid="Open native sheet"`
     - `added text "Open native sheet"`
     - `added button "Underlying action" testid="Underlying action"`
     - `added text "Underlying action"`
     - `added text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`
     - `removed button "Close sheet"`
     - `removed text "Close sheet"`
5. ✓ `expect.toHaveText` `getByTestId("results")` (44ms, video 0:05) — `tests/overlay.e2e.ts:14`
   - screen: 2 changes since step 4 at `dev.e2e.overlay1563`, 12 nodes
     - `added text "Underlying taps: 1\nOverlay touches: 0" text="Underlying taps: 1 Overlay touches: 0" testid="results"`
     - `removed text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`

## Evidence

- [video](attempt-1/video/video.mp4) `evidence/native-sheet-control/results/overlay-uikit-page-sheet-control-bf6cf67877c91427/attempt-1/video/video.mp4`

<sub>e2e 0.23.0 · run `01a1c7a2-eb05-7428-9d3f-eafdbe10298e` · the whole run is in `report.json`</sub>
