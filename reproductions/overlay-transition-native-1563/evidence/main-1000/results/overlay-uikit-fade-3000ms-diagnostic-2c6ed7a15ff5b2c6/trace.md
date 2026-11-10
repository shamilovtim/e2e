# ✗ UIKit fade 3000ms diagnostic

`tests/overlay.e2e.ts` · failed · 12.3s

Ran on: platform `ios` · device `CA371337-B1F1-4A84-91BB-0E2ACA90E3E2`

**ASSERTION_FAILED**

```text
expect.toHaveText failed
locator: getByTestId("results")
expected: text "Underlying taps: 1\nOverlay touches: 0"
observed: text "Underlying taps: 0 Overlay touches: 1" (match count 1)
```

Look at: `tests/overlay.e2e.ts:14`  

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (1.8s, video 0:00) — `tests/overlay.e2e.ts:10`
2. ✓ `locator.tap` `getByRole("button", name: "Open slow fade overlay")` (1.6s, video 0:01) — `tests/overlay.e2e.ts:11`
   - tap button "Open slow fade overlay" (1.6s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `locator.tap` `getByRole("button", name: "Close overlay")` (1.4s, video 0:03) — `tests/overlay.e2e.ts:12`
   - tap button "Close overlay" (1.4s)
   - screen: 3 changes since step 2 at `dev.e2e.overlay1563`, 15 nodes
     - `added text "Fade duration: 3.0 s"`
     - `added button "Close overlay" testid="Close overlay"`
     - `added text "Close overlay"`
4. ✓ `locator.tap` `getByRole("button", name: "Underlying action")` (392ms, video 0:04) — `tests/overlay.e2e.ts:13`
   - tap button "Underlying action" (392ms)
   - screen: 3 changes since step 3 at `dev.e2e.overlay1563`, 12 nodes
     - `removed text "Fade duration: 3.0 s"`
     - `removed button "Close overlay" testid="Close overlay"`
     - `removed text "Close overlay"`
5. ✗ `expect.toHaveText` `getByTestId("results")` (5.0s, video 0:05) — **ASSERTION_FAILED** — `tests/overlay.e2e.ts:14`
   - expect gave up after 34 reads in 5.0s: text "Underlying taps: 0 Overlay touches: 1" (1 match) x34
   - screen: 2 changes since step 4 at `dev.e2e.overlay1563`, 12 nodes
     - `added text "Underlying taps: 0\nOverlay touches: 1" text="Underlying taps: 0 Overlay touches: 1" testid="results"`
     - `removed text "Underlying taps: 0\nOverlay touches: 0" text="Underlying taps: 0 Overlay touches: 0" testid="results"`

## Screen at failure

`dev.e2e.overlay1563` · viewport 393x852 · 12 nodes  

![screenshot at failure](attempt-1/screenshots/001-failure.png)

The screen as the agent reads it, one node per line: `#id role "name" text="…" [states]`.

```text
#root screen
 #n915 application "OverlayFixture"
  #n916 text "Overlay transition proof"
  #n917 button "Open fade overlay" testid="Open fade overlay"
   #n918 text "Open fade overlay"
  #n919 button "Open slow fade overlay" testid="Open slow fade overlay"
   #n920 text "Open slow fade overlay"
  #n921 button "Open native sheet" testid="Open native sheet"
   #n922 text "Open native sheet"
  #n923 button "Underlying action" testid="Underlying action"
   #n924 text "Underlying action"
  #n925 text "Underlying taps: 0\nOverlay touches: 1" text="Underlying taps: 0 Overlay touches: 1" testid="results"
```

## Evidence

- [screenshot](attempt-1/screenshots/001-failure.png) `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/attempt-1/screenshots/001-failure.png`
- [screen](attempt-1/screen-at-failure.txt) `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/attempt-1/screen-at-failure.txt`
- [video](attempt-1/video/video.mp4) `evidence/main-1000/results/overlay-uikit-fade-3000ms-diagnostic-2c6ed7a15ff5b2c6/attempt-1/video/video.mp4`

<sub>e2e 0.23.0 · run `01a1c7a0-f7a5-7b7d-af1a-939e2fcfffa5` · the whole run is in `report.json`</sub>
