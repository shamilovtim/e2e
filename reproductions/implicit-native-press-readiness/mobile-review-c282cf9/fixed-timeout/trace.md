# ✓ expired pending press stays unsent after fade completion

`tests/timeout-observe.e2e.ts` · passed · 12.4s

Ran on: platform `ios` · device `<owned-simulator>`

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (3.3s, video 0:00) — `tests/timeout-observe.e2e.ts:4`
2. ✓ `locator.tap` `getByRole("button", name: "Open slow fade overlay")` (1.6s, video 0:03) — `tests/timeout-observe.e2e.ts:5`
   - tap button "Open slow fade overlay" (1.6s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `locator.tap` `getByRole("button", name: "Close overlay")` (1.6s, video 0:04) — `tests/timeout-observe.e2e.ts:6`
   - tap button "Close overlay" (1.6s)
   - screen: 3 changes since step 2 at `dev.e2e.overlay1563`, 15 nodes
     - `added text "Fade duration: 3.0 s"`
     - `added button "Close overlay" testid="Close overlay"`
     - `added text "Close overlay"`
4. ✗ `locator.tap` `getByRole("button", name: "Underlying action")` (501ms, video 0:06) — **ACTION_FAILED** — `tests/timeout-observe.e2e.ts:8`
   - ✗ tap button "Underlying action": **ACTION_FAILED**
   - screen: 3 changes since step 3 at `dev.e2e.overlay1563`, 12 nodes
     - `removed text "Fade duration: 3.0 s"`
     - `removed button "Close overlay" testid="Close overlay"`
     - `removed text "Close overlay"`
5. ✓ `expect.toHaveText` `getByTestId("results")` (42ms, video 0:10) — `tests/timeout-observe.e2e.ts:13`
   - screen: unchanged since step 4 at `dev.e2e.overlay1563`

## Evidence

- [video](video.mp4) `runner-proof/results/timeout-observe-expired-pending-press-stays-20e0da70d66ef3ef/video.mp4`

<sub>e2e 0.23.0 · run `01a1c8fe-2d57-7335-a750-65f0f2673eda` · the whole run is in `report.json`</sub>
