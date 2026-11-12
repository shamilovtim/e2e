import hashlib
import json
import re
import shlex
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
adb = Path(owned["sdk"]) / "platform-tools/adb"
serial = owned["serial"]

def device(*args, timeout=10, check=True):
    return subprocess.run([str(adb), "-s", serial, *args], capture_output=True,
                          timeout=timeout, check=check)

actual_name = device("emu", "avd", "name").stdout.decode().splitlines()[0]
assert actual_name == owned["avdName"], "Refuse to use an AVD not created by this task"
assert device("shell", "getprop", "ro.boot.qemu").stdout.strip() == b"1"
remote = config["remoteRoot"]
assert re.fullmatch(r"/data/local/tmp/agent-device-recorder-[a-zA-Z0-9-]+", remote)

def verify_runtime(checkout, manifest):
    value = json.loads(Path(manifest).read_text())
    root = Path(checkout)
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip() == value["source"]
    assert not subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True)
    assert not any(path.is_symlink() for path in (root / "dist").rglob("*"))
    actual = {path.relative_to(root).as_posix() for path in (root / "dist").rglob("*.js")}
    assert actual == {row["path"] for row in value["files"]}, "Runtime file set changed"
    for row in value["files"] + value["packageAndBuildInputs"]:
        data = (root / row["path"]).read_bytes()
        assert len(data) == row["bytes"] and hashlib.sha256(data).hexdigest() == row["sha256"]
    return value

manifests = {name: verify_runtime(config[name + "Checkout"], config[name + "Manifest"])
             for name in ("base", "head")}
source = output / "source"
source.mkdir()
for name in ("run_native_pair_v2.py", "native_transport_driver_v2.mjs", "hold_recorder_parent_v1.c"):
    shutil.copyfile(proof / name, source / name)
for name in ("base", "head"):
    shutil.copyfile(config[name + "Manifest"], output / (name + "-runtime-manifest.json"))
binary = proof / "hold_recorder_parent_v1"
preflight = {"sourcesArchivedBeforeExecution": True,
             "sourceHashes": {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in source.iterdir()},
             "fixtureBinarySha256": hashlib.sha256(binary.read_bytes()).hexdigest(),
             "base": manifests["base"]["source"], "head": manifests["head"]["source"],
             "completeRuntimeSetsVerified": {name: len(value["files"]) for name, value in manifests.items()}}
(output / "preflight.json").write_text(json.dumps(preflight, indent=2) + "\n")
fixture = remote + "/parent"
video = remote + "/completed.mp4"
ready = remote + "/ready.jsonl"
parent = None
identity = None
result = {"qualified": False, "cleanup": "not-started", "phases": []}
try:
    (output / "before.png").write_bytes(device("exec-out", "screencap", "-p").stdout)
    device("shell", "mkdir", remote)
    device("push", str(binary), fixture)
    device("shell", "chmod", "700", fixture)
    command = f"{shlex.quote(fixture)} {shlex.quote(video)} >{shlex.quote(ready)} 2>&1 & echo $!"
    parent = device("shell", command).stdout.decode().strip()
    assert parent.isdigit()
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        ready_result = device("shell", "cat", ready, check=False)
        (output / "fixture-ready.private.jsonl").write_bytes(ready_result.stdout)
        rows = []
        for line in ready_result.stdout.decode(errors="replace").splitlines():
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
        started = next((row for row in rows if "child" in row), None)
        exited = next((row for row in rows if row.get("exited")), None)
        if started and exited:
            assert str(started["parent"]) == parent
            assert exited["code"] == 1 and exited["status"] == 0, "Native screenrecord did not exit successfully"
            child = str(started["child"])
            stat = device("shell", "cat", f"/proc/{child}/stat").stdout.decode()
            fields = stat[stat.rfind(")") + 1:].split()
            command_line = device("shell", "cat", f"/proc/{child}/cmdline").stdout
            assert fields[0] == "Z" and command_line == b""
            identity = {"pid": child, "remotePath": video, "startTime": fields[19]}
            break
        time.sleep(0.25)
    assert identity is not None, "No successful unreaped recorder was established"
    device("pull", video, str(output / "completed-recorder.mp4"))
    assert (output / "completed-recorder.mp4").stat().st_size > 32
    result["qualified"] = True
    result["nativeFact"] = {"state": "Z", "commandLineEmpty": True, "successfulExit": True}
    for name in ("base", "head"):
        directory = output / name
        directory.mkdir()
        shutil.copyfile(output / "completed-recorder.mp4", directory / "video.mp4")
        input_value = {"checkout": config[name + "Checkout"], "source": manifests[name]["source"],
                       "adb": str(adb), "serial": serial, "identity": identity,
                       "privateTranscript": str(directory / "adb-transcript.private.json")}
        (directory / "input.private.json").write_text(json.dumps(input_value, indent=2) + "\n")
        run = subprocess.run([config["node"], "--experimental-transform-types",
                              str(source / "native_transport_driver_v2.mjs"),
                              str(directory / "input.private.json")], capture_output=True, text=True, timeout=30)
        (directory / "stdout.private.log").write_text(run.stdout)
        (directory / "stderr.private.log").write_text(run.stderr)
        try:
            observed = json.loads(run.stdout)
        except ValueError:
            observed = {"driverSetupFailed": True}
        result["phases"].append({"phase": name, "driverExitCode": run.returncode, "observed": observed,
                                 "videoScope": "Unchanged completed artifact from this paired unreaped recorder; not a host-screen recording"})
        verify_runtime(config[name + "Checkout"], config[name + "Manifest"])
    (output / "after.png").write_bytes(device("exec-out", "screencap", "-p").stdout)
finally:
    if not (output / "completed-recorder.mp4").exists():
        device("pull", video, str(output / "partial-recorder.mp4"), check=False)
    if parent:
        current = device("shell", "cat", f"/proc/{parent}/cmdline", check=False)
        if current.returncode == 0 and current.stdout.split(b"\0")[0].decode() == fixture:
            stopped = device("shell", "kill", "-15", parent, check=False)
            result["cleanup"] = "release-requested" if stopped.returncode == 0 else "release-unconfirmed"
            if stopped.returncode == 0 and identity:
                for attempt in range(20):
                    present = device("shell", "test", "-d", f"/proc/{identity['pid']}", check=False)
                    if present.returncode == 1 and not present.stderr.strip():
                        result["cleanup"] = "child-reaped"
                        break
                    time.sleep(0.1)
        else:
            result["cleanup"] = "parent-already-gone-or-unconfirmed"
    (output / "result.json").write_text(json.dumps(result, indent=2) + "\n")
assert result["qualified"]
assert [phase["driverExitCode"] for phase in result["phases"]] == [1, 0]
assert result["phases"][0]["observed"].get("stop") == "ownership-lost"
assert result["phases"][1]["observed"].get("stop") == "already-missing"
