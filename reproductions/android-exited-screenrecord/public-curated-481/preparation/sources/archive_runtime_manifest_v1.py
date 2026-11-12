import hashlib
import json
import subprocess
import sys
from pathlib import Path

checkout = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2])
source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=checkout, text=True).strip()
tree = subprocess.check_output(["git", "rev-parse", "HEAD^{tree}"], cwd=checkout, text=True).strip()
status = subprocess.check_output(["git", "status", "--porcelain"], cwd=checkout, text=True)
assert not status, "Runtime source checkout must be clean"
dist = checkout / "dist"
assert dist.is_dir(), "Build this exact checkout first"
assert not any(path.is_symlink() for path in dist.rglob("*")), "Runtime build contains a symlink"
runtime = []
for path in sorted(dist.rglob("*.js")):
    data = path.read_bytes()
    runtime.append({"path": path.relative_to(checkout).as_posix(), "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest()})
assert runtime, "No generated runtime JavaScript"
inputs = []
for relative in ("package.json", "pnpm-lock.yaml", "tsdown.config.ts", "scripts/build-entries.ts",
                 "bin/agent-device.mjs", "scripts/build-android-helper.sh",
                 "scripts/package-android-helper.sh", "scripts/release-version.mjs"):
    path = checkout / relative
    assert path.is_file() and not path.is_symlink(), relative
    data = path.read_bytes()
    inputs.append({"path": relative, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
package = json.loads((checkout / "package.json").read_text())
value = {"source": source, "tree": tree, "checkoutClean": True,
         "scope": "Complete generated dist/**/*.js file set, including CLI, daemon, workers and plugin entries",
         "symlinks": [], "runtimeFileCount": len(runtime), "files": runtime,
         "packageAndBuildInputs": inputs, "packageVersion": package["version"],
         "packageExports": package.get("exports", {}), "packageBin": package.get("bin", {})}
output.write_text(json.dumps(value, indent=2) + "\n")
