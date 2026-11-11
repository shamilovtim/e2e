import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

root = Path(__file__).resolve().parent.parent
sdk = Path('SDK_SOURCE_ROOT')
parser = argparse.ArgumentParser()
parser.add_argument('--head', required=True)
parser.add_argument('--derived', type=Path, required=True)
parser.add_argument('--phase', required=True)
parser.add_argument('--runtime-manifest', type=Path, required=True)
args = parser.parse_args()
head = args.head
derived = args.derived
case = root / 'evidence' / args.phase
case.mkdir(parents=True, exist_ok=False)
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=sdk, text=True).strip() == head
assert not subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=sdk, text=True)
runtime_path = args.runtime_manifest
runtime = json.loads(runtime_path.read_text())
assert runtime['head'] == head
for entry in runtime['files']:
    assert hashlib.sha256((sdk / entry['path']).read_bytes()).hexdigest() == entry['sha256']
manifest_path = derived / '.agent-device-runner-cache.json'
manifest = json.loads(manifest_path.read_text())
fp = subprocess.check_output(['node', '--experimental-strip-types', '--input-type=module', '-e', 'import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts";console.log(computeRunnerSourceFingerprint(process.cwd()));'], cwd=sdk, text=True).strip()
assert fp == manifest['runnerSourceFingerprint']
binary = next(x for x in manifest['artifacts']['entries'] if x['path'].endswith('xctest/AgentDeviceRunnerUITests'))
assert hashlib.sha256((derived / binary['path']).read_bytes()).hexdigest() == binary['digest']
owned = json.loads((root / 'owned-device-state-private.json').read_text())
device = next(x['udid'] for x in owned if x['role'] == 'phone')
app = subprocess.check_output(['xcrun', 'simctl', 'get_app_container', device, 'dev.e2e.overlay1563', 'app'], text=True).strip()
exe = subprocess.check_output(['plutil', '-extract', 'CFBundleExecutable', 'raw', '-o', '-', app + '/Info.plist'], text=True).strip()
fixture = hashlib.sha256((Path(app) / exe).read_bytes()).hexdigest()
assert fixture == '4daf9e0cff9511f6282ead5e7a4bd61cb057d4428c586605996a941c8b1b39f2'
original = Path('ORIGINAL_FADE_HARNESS')
harness_hash = hashlib.sha256(original.read_bytes()).hexdigest()
assert harness_hash == 'd0062ebf47af505bbbb25b17bce4e8400c56e46917d319d99f5588c67b4a7599'
shutil.copyfile(original, case / 'executed-wrapper.mjs')
shutil.copyfile(__file__, case / 'executed-driver.py')
shutil.copyfile(manifest_path, case / 'private-native-manifest.json')
shutil.copyfile(runtime_path, case / 'runtime-js-manifest.json')
inputs = {'head': head, 'sourceTree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=sdk, text=True).strip(), 'nativeFingerprint': fp, 'nativeBinarySha256': binary['digest'], 'fixtureBinarySha256': fixture, 'runtimeJSFiles': len(runtime['files']), 'wrapperSha256': harness_hash, 'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'archivedBeforeRun': True, 'case': 'fade750-1'}
(case / 'execution-inputs.json').write_text(json.dumps(inputs, indent=2) + '\n')
env = os.environ.copy()
env.update(SDK_ENTRY=str(sdk / 'dist/src/index.js'), ACCEPTANCE_ROOT=str(case), OVERLAY_DEVICE=device, NATIVE_XCTESTRUN=manifest['artifacts']['xctestrunPath'], NATIVE_DERIVED=str(derived), ACCEPTANCE_CASE='fade750-1')
began = time.monotonic()
with (case / 'private-run.log').open('w') as log:
    run = subprocess.run(['node', str(case / 'executed-wrapper.mjs')], cwd=sdk, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=300)
with (case / 'private-cleanup.log').open('w') as log:
    stop = subprocess.run(['node', str(sdk / 'bin/agent-device.mjs'), 'daemon', 'stop', '--state-dir', str(case / 'sdk-final-state'), '--clean', '--json'], cwd=sdk, stdout=log, stderr=subprocess.STDOUT, timeout=60)
data = json.loads((case / 'sdk-final/fade750-1/result.json').read_text())
assert hashlib.sha256((derived / binary['path']).read_bytes()).hexdigest() == binary['digest']
summary = {'source': head, 'exitCode': run.returncode, 'cleanupExitCode': stop.returncode, 'success': data.get('success'), 'result': data.get('result'), 'closeMs': data.get('closeMs'), 'pressMs': data.get('pressMs'), 'wallSeconds': time.monotonic() - began, 'harnessSha256': harness_hash}
(case / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
raise SystemExit(0 if run.returncode == 0 and stop.returncode == 0 and data.get('success') else 1)
