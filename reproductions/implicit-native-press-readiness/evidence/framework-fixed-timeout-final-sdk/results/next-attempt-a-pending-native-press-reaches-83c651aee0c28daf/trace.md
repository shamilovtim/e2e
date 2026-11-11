# ✓ a pending native press reaches its deadline

`tests/next-attempt.e2e.ts` · passed · 6.8s

Ran on: platform `ios` · device `<run-or-owned-device-id>`

## Steps

1. ✓ `device.openApp` `dev.e2e.overlay1563` (1.6s, video 0:00) — `tests/next-attempt.e2e.ts:4`
2. ✓ `locator.tap` `getByRole("button", name: "Open slow fade overlay")` (1.5s, video 0:01) — `tests/next-attempt.e2e.ts:5`
   - tap button "Open slow fade overlay" (1.5s)
   - screen: 12 nodes at `dev.e2e.overlay1563`
3. ✓ `locator.tap` `getByRole("button", name: "Close overlay")` (1.5s, video 0:03) — `tests/next-attempt.e2e.ts:6`
   - tap button "Close overlay" (1.5s)
   - screen: 3 changes since step 2 at `dev.e2e.overlay1563`, 15 nodes
     - `added text "Fade duration: 3.0 s"`
     - `added button "Close overlay" testid="Close overlay"`
     - `added text "Close overlay"`
4. ✗ `locator.tap` `getByRole("button", name: "Underlying action")` (507ms, video 0:04) — **ACTION_FAILED** — `tests/next-attempt.e2e.ts:8`
   - ✗ tap button "Underlying action": **ACTION_FAILED**
   - screen: 3 changes since step 3 at `dev.e2e.overlay1563`, 12 nodes
     - `removed text "Fade duration: 3.0 s"`
     - `removed button "Close overlay" testid="Close overlay"`
     - `removed text "Close overlay"`

## Evidence

- [video](attempt-1/video/video.mp4) `final-native/results/next-attempt-a-pending-native-press-reaches-83c651aee0c28daf/attempt-1/video/video.mp4`

<sub>e2e 0.23.0 · run `<run-or-owned-device-id>` · the whole run is in `report.json`</sub>
