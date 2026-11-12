import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

config = json.loads(Path(sys.argv[1]).read_text())
proof = Path(config["proofRoot"])
output = Path(config["output"])
output.mkdir()
owned = json.loads(Path(config["ownedDescriptor"]).read_text())
assert owned["createdByThisTask"] and owned["booted"]
sdk = Path(owned["sdk"])
adb = sdk / "platform-tools/adb"
serial = owned["serial"]
actual = subprocess.run([str(adb), "-s", serial, "emu", "avd", "name"], check=True,
                        capture_output=True, text=True)
assert actual.stdout.splitlines()[0] == owned["avdName"]
checkout = Path(config["checkout"])
manifest = json.loads(Path(config["runtimeManifest"]).read_text())

def verify_runtime():
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=checkout, text=True).strip() == manifest["source"]
    assert not subprocess.check_output(["git", "status", "--porcelain"], cwd=checkout, text=True)
    assert not any(path.is_symlink() for path in (checkout / "dist").rglob("*"))
    assert {path.relative_to(checkout).as_posix() for path in (checkout / "dist").rglob("*.js")} == {row["path"] for row in manifest["files"]}
    for row in manifest["files"] + manifest["packageAndBuildInputs"]:
        data = (checkout / row["path"]).read_bytes()
        assert len(data) == row["bytes"] and hashlib.sha256(data).hexdigest() == row["sha256"]

verify_runtime()
(output / "source").mkdir()
shutil.copyfile(Path(__file__), output / "source" / Path(__file__).name)
shutil.copyfile(config["runtimeManifest"], output / "runtime-manifest.json")
assets = []
for helper in ("snapshot", "ime"):
    files = list((checkout / "android" / (helper + "-helper") / "dist").glob("*.apk"))
    assert len(files) == 1 and not files[0].is_symlink()
    data = files[0].read_bytes()
    assets.append({"path": files[0].relative_to(checkout).as_posix(), "bytes": len(data),
                   "sha256": hashlib.sha256(data).hexdigest()})
(output / "preflight.json").write_text(json.dumps({"source": manifest["source"],
    "archivedBeforeCliExecution": True, "completeRuntimeFileCount": len(manifest["files"]),
    "wrapperSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "nativeHelperAssets": assets}, indent=2) + "\n")
env = {**os.environ, "ANDROID_HOME": str(sdk), "ANDROID_SDK_ROOT": str(sdk),
       "PATH": str(sdk / "platform-tools") + os.pathsep + os.environ["PATH"],
       "AGENT_DEVICE_STATE_DIR": str(output / "state")}
session = "android-recorder-proof"
command = [config["node"], str(checkout / "bin/agent-device.mjs")]
calls = []
result = {"source": manifest["source"], "success": False, "commands": calls,
          "boundary": "built public CLI with local ADB on a new task-owned emulator"}

def cli(name, args, timeout=60, check=True):
    run = subprocess.run(command + args + ["--json"], cwd=checkout, env=env,
                         capture_output=True, text=True, timeout=timeout)
    (output / (name + ".stdout.private.json")).write_text(run.stdout)
    (output / (name + ".stderr.private.log")).write_text(run.stderr)
    calls.append({"command": name, "exitCode": run.returncode})
    if check:
        assert run.returncode == 0, "Public CLI command failed: " + name
        return json.loads(run.stdout)
    return None

started = False
try:
    cli("open", ["open", "settings", "--platform", "android", "--serial", serial, "--session", session])
    snapshot = cli("snapshot", ["snapshot", "-i", "--session", session])
    snapshots = []
    pending = [snapshot]
    while pending:
        value = pending.pop()
        if isinstance(value, dict):
            if "androidSnapshot" in value:
                snapshots.append(value["androidSnapshot"])
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
    assert len(snapshots) == 1 and snapshots[0]["backend"] == "android-helper"
    assert snapshots[0]["helperVersion"] == manifest["packageVersion"]
    result["androidSnapshot"] = {"backend": snapshots[0]["backend"], "helperVersion": snapshots[0]["helperVersion"]}
    (output / "before.png").write_bytes(subprocess.check_output([str(adb), "-s", serial, "exec-out", "screencap", "-p"]))
    cli("record-start", ["record", "start", str(output / "video.mp4"), "--session", session, "--scope", "device", "--hide-touches"])
    started = True
    subprocess.run([str(adb), "-s", serial, "shell", "input", "keyevent", "24"], check=True, capture_output=True)
    time.sleep(2)
    stopped = cli("record-stop", ["record", "stop", "--session", session], timeout=90)
    started = False
    assert (output / "video.mp4").is_file() and (output / "video.mp4").stat().st_size > 32
    result["videoBytes"] = (output / "video.mp4").stat().st_size
    result["videoSha256"] = hashlib.sha256((output / "video.mp4").read_bytes()).hexdigest()
    (output / "after.png").write_bytes(subprocess.check_output([str(adb), "-s", serial, "exec-out", "screencap", "-p"]))
    result["success"] = True
finally:
    if started:
        cli("record-stop-cleanup", ["record", "stop", "--session", session], timeout=90, check=False)
    cli("close", ["close", "--session", session], check=False)
    cli("daemon-stop", ["daemon", "stop", "--clean"], check=False)
    verify_runtime()
    (output / "result.json").write_text(json.dumps(result, indent=2) + "\n")
