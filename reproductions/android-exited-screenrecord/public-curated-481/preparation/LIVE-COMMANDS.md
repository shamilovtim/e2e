# Composed Android native case

The exact built CLI and daemon run with a new isolated state directory and the owned fixture SDK root. The fixture's adb executable delegates every non-launch call unchanged to the actual ADB executable. Only the exact screenrecord launch is replaced by the pinned native parent, preserving requested bitrate and adding a12-second time limit. Production start attests its actual live child PID/starttime and persists the ordinary manifest. No manifest, process read, stop response, pull or export result is injected.

Generic commands (actual serial/state/output paths remain private):

```sh
node bin/agent-device.mjs open settings --platform android --serial OWNED_EMULATOR --session proof --json
node bin/agent-device.mjs snapshot -i --session proof --json
node bin/agent-device.mjs record start OUTPUT.mp4 --session proof --scope device --hide-touches --json
adb -s OWNED_EMULATOR shell cat /proc/RECORDER_A/cmdline
adb -s OWNED_EMULATOR shell cat /proc/RECORDER_A/stat
node bin/agent-device.mjs record stop --session proof --json
node bin/agent-device.mjs close --session proof --json
node bin/agent-device.mjs daemon stop --clean --json
```

Actual system volume keys provide generic screen motion during native capture. The fixture observes successful exit with waitid(WNOWAIT), leaving a real Z/empty-argv process and preserving its starttime until after ordinary record stop. The parent then reaps without signalling that exited child. Sources were archived before execution; native helper assets, complete631generatedJS file sets and package/build inputs were pinned. Read PREFLIGHT for the generic emulator model/API.

The completed native fence marker is retained intentionally after successful ordinary stop. The finalizer persists completion before deleting the native chunk; actual chunk absence and typed retired disposition are checked independently. The fixture cleanup separately verifies the child is reaped with0signals.

The baseline's ordinary stop fails ownership confirmation. A later close runs after the fixture parent has reaped the child and can recover export; that later cleanup is explicitly separate from the failed ordinary stop. All original/returned copies within each recorded case are byte-identical, with duplicate paths mapped privately.
