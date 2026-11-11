# Mobile cancellation review proof

All application media, screenshots and app event logs here are from the constructed UIKit overlay fixture. No production application data is included. `MATRIX.json` records exact source and native asset attribution. The companion still pins published agent-device 0.21.36; native overlay verification deliberately uses the separately identified SDK readiness candidate, equally on main and the fixed branch.

| Case | Result |
| --- | --- |
| Main d8, 500 ms timeout | Step fails at 502 ms. The underlying control later receives one input after the three-second fade completes. The unchanged assertion fails, exit 1. |
| Fixed c282, same SDK/native assets and test | After the timeout and three-second fade, both input counters remain zero. Exit 0. |
| Immediate following attempt | Receives exactly its own one tap. No added pause between attempts. |
| Current built SDK 965, ordinary 750 ms sequence | Underlying one, overlay zero, exit 0. This is a build smoke; close RPC outlasted the fade. |

Each result directory retains its video and native event log. Framework traces retain observable results; owned device identifiers are replaced with a generic placeholder. Selected press request events contain no daemon state, credentials or diagnostic archives. Main and fixed timeout tests have identical source. The fresh simulator and both owned daemon states were cleaned after verification.

Cancellation covers pending SDK press requests, including taps, double taps, focus and checks. Nonpress requests, holds, gestures and recording finalization keep their existing lifetimes. A canceled SDK promise does not prove already accepted native work stopped.
