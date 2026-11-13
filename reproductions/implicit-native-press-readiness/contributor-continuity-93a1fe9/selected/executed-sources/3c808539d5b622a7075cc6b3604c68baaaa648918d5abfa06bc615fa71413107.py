import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import shutil
import statistics
import signal
import time
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('kind', choices=['lifecycle'])
parser.add_argument('mode')
parser.add_argument('phase')
parser.add_argument('--sdk-root', type=Path, required=True)
parser.add_argument('--derived', type=Path, required=True)
parser.add_argument('--head', required=True)
parser.add_argument('--fixture-sha', required=True)
parser.add_argument('--runtime-manifest', type=Path, required=True)
parser.add_argument('--guest-bridge-manifest', type=Path, required=True)
parser.add_argument('--native-built-at')
parser.add_argument('--wrapper', type=Path, required=True)
parser.add_argument('--observer', type=Path, required=True)
parser.add_argument('--fixture-app', required=True)
args = parser.parse_args()
root = Path('/path/to/proof')
owned_path = Path('/path/to/prior-proof/owned-device-state-private.json')
case = root / 'evidence' / args.phase
case.mkdir(parents=True, exist_ok=False)
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.sdk_root, text=True).strip() == args.head
assert not subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=args.sdk_root, text=True)
manifest_path = args.derived / '.agent-device-runner-cache.json'
manifest = json.loads(manifest_path.read_text())
native_fp = subprocess.check_output(['node', '--experimental-strip-types', '--input-type=module', '-e', 'import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts";console.log(computeRunnerSourceFingerprint(process.cwd()));'], cwd=args.sdk_root, text=True).strip()
assert native_fp == manifest['runnerSourceFingerprint']
binary = next(x for x in manifest['artifacts']['entries'] if x['path'].endswith('xctest/AgentDeviceRunnerUITests'))
for entry in manifest['artifacts']['entries']:
    assert not (args.derived / entry['path']).is_symlink()
    assert hashlib.sha256((args.derived / entry['path']).read_bytes()).hexdigest() == entry['digest']
xctestrun = Path(manifest['artifacts']['xctestrunPath'])
assert xctestrun.is_file() and not xctestrun.is_symlink()
assert hashlib.sha256(xctestrun.read_bytes()).hexdigest() == manifest['artifacts']['xctestrunDigest']
guest = json.loads(args.guest_bridge_manifest.read_text())
assert guest['head'] == args.head
guest_binary = Path(guest['path'])
assert guest_binary.is_file() and not guest_binary.is_symlink()
assert hashlib.sha256(guest_binary.read_bytes()).hexdigest() == guest['binarySha256']
for entry in guest['sourceFiles']:
    assert hashlib.sha256((args.sdk_root / entry['path']).read_bytes()).hexdigest() == entry['sha256']
runtime = json.loads(args.runtime_manifest.read_text())
assert runtime['head'] == args.head
dist = args.sdk_root / 'dist'
assert not dist.is_symlink() and not any(p.is_symlink() for p in dist.rglob('*'))
assert not any(p.suffix in ['.mjs', '.cjs'] for p in dist.rglob('*')), 'Unexpected emitted JavaScript extension outside this complete .js manifest'
actual_js = sorted(str(p.relative_to(args.sdk_root)) for p in dist.rglob('*.js'))
assert actual_js == sorted(e['path'] for e in runtime['files']), 'Runtime manifest must cover the exact complete emitted JavaScript file set'
for entry in runtime['files']:
    assert hashlib.sha256((args.sdk_root / entry['path']).read_bytes()).hexdigest() == entry['sha256']
wrapper = args.wrapper
assert wrapper.is_file() and not wrapper.is_symlink()
assert args.observer.is_file() and not args.observer.is_symlink()
shutil.copyfile(wrapper, case / 'executed-wrapper.mjs')
shutil.copyfile(__file__, case / 'executed-driver.py')
shutil.copyfile(args.observer, case / 'executed-inspector.mjs')
shutil.copyfile(manifest_path, case / 'private-native-manifest.json')
shutil.copyfile(args.runtime_manifest, case / 'runtime-js-manifest.json')
shutil.copyfile(args.guest_bridge_manifest, case / 'guest-bridge-private-manifest.json')
shutil.copyfile(xctestrun, case / 'executed-native.xctestrun')
launch_inputs = []
for rel in ['bin/agent-device.mjs', 'package.json', 'scripts/build-entries.ts', 'scripts/build-xcuitest-apple.sh']:
    path = args.sdk_root / rel
    assert path.is_file() and not path.is_symlink()
    data = path.read_bytes()
    launch_inputs.append({'path': rel, 'sha256': hashlib.sha256(data).hexdigest()})
    archived = case / 'runtime-inputs' / rel
    archived.parent.mkdir(parents=True, exist_ok=True)
    archived.write_bytes(data)
(case / 'runtime-launch-input-manifest.json').write_text(json.dumps(launch_inputs, indent=2) + '\n')
source_patch = subprocess.check_output(['git', 'show', '--format=', '--binary', 'HEAD'], cwd=args.sdk_root)
(case / 'source-commit.patch').write_bytes(source_patch)
(case / 'source-delta-from-base.patch').write_bytes(subprocess.check_output(['git', 'diff', '--binary', 'b7ded9cfb26927c7c60d3a04272b62ef7d47da92', 'HEAD'], cwd=args.sdk_root))
source_tree = subprocess.check_output(['git', 'ls-tree', '-r', 'HEAD'], cwd=args.sdk_root)
(case / 'source-tree-manifest.txt').write_bytes(source_tree)
inputs = {'head': args.head, 'kind': args.kind, 'mode': args.mode,
          'nativeBuiltAt': args.native_built_at or args.head,
          'sourceTree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=args.sdk_root, text=True).strip(),
          'nativeFingerprint': native_fp, 'nativeBinarySha256': binary['digest'],
          'fixtureBinarySha256': args.fixture_sha, 'runtimeJSFiles': len(runtime['files']),
          'wrapperSha256': hashlib.sha256(wrapper.read_bytes()).hexdigest(),
          'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'observerSha256': hashlib.sha256((case / 'executed-inspector.mjs').read_bytes()).hexdigest(), 'archivedBeforeRun': True, 'runtimeCompleteFileSetVerified': True, 'runtimeSymlinksFound': False,
          'nativeArtifactsVerified': len(manifest['artifacts']['entries']),
          'xctestrunSha256': hashlib.sha256(xctestrun.read_bytes()).hexdigest(),
          'nativeCacheManifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
          'runtimeLaunchInputs': launch_inputs,
          'resolvedCLIEntry': 'dist/src/internal/bin.js',
          'guestBridge': {key: guest[key] for key in ['sourceHash', 'cacheKey', 'binarySha256', 'sourceFiles']},
          'nodeVersion': subprocess.check_output(['node', '--version'], text=True).strip(),
          'explicitNormalBudgetWarmup': os.environ.get('QA_WARMUP_REF') == '1',
          'sourceCommitPatchSha256': hashlib.sha256(source_patch).hexdigest(),
          'sourceTreeManifestSha256': hashlib.sha256(source_tree).hexdigest()}
(case / 'execution-inputs.json').write_text(json.dumps(inputs, indent=2) + '\n')
shutil.copyfile(owned_path, case / 'owned-device-state-private.json')
owned = json.loads(owned_path.read_text())
phone = next(x for x in owned if x['role'] == 'phone')
assert phone['createdByThisTask'] and phone['bootedByThisTask']
device = phone['udid']
installed = Path(subprocess.check_output(['xcrun', 'simctl', 'get_app_container', device, args.fixture_app, 'app'], text=True).strip())
executable = subprocess.check_output(['plutil', '-extract', 'CFBundleExecutable', 'raw', '-o', '-', str(installed / 'Info.plist')], text=True).strip()
assert not (installed / executable).is_symlink()
assert hashlib.sha256((installed / executable).read_bytes()).hexdigest() == args.fixture_sha
inputs['observedFixtureBinarySha256'] = args.fixture_sha
inputs['fixtureApp'] = args.fixture_app
inputs['observerSourcePath'] = str(args.observer)
(case / 'execution-inputs.json').write_text(json.dumps(inputs, indent=2) + '\n')
env = os.environ.copy()
env.update(QA_ROOT=str(root), QA_PHASE=args.phase, QA_MODE=args.mode, SDK_ROOT=str(args.sdk_root),
           NATIVE_DERIVED=str(args.derived), QA_SDK_SOURCE=args.head, QA_NATIVE_BUILT_AT=args.native_built_at or args.head,
           QA_NATIVE_FP=native_fp, QA_FIXTURE_BINARY_SHA=args.fixture_sha,
           QA_JS_MANIFEST=str(case / 'runtime-js-manifest.json'), QA_DEVICE=device, QA_OBSERVER_PATH=str(case / 'executed-inspector.mjs'), QA_FIXTURE_APP=args.fixture_app, QA_PARENT_RECORDING='1')
result = {'phase': args.phase, 'source': args.head}
recorder = None
node = None

def group_alive():
    if node is None:
        return False
    try:
        os.killpg(node.pid, 0)
        return True
    except ProcessLookupError:
        return False

def stop_group():
    if not group_alive():
        return
    result['nodeGroupEscalated'] = True
    for sig, seconds in [(signal.SIGTERM, 3), (signal.SIGKILL, 3)]:
        if not group_alive():
            break
        try:
            os.killpg(node.pid, sig)
        except ProcessLookupError:
            break
        deadline = time.monotonic() + seconds
        while group_alive() and time.monotonic() < deadline:
            time.sleep(.05)
    if node.poll() is None:
        node.wait(timeout=3)
    result['nodeGroupStillAlive'] = group_alive()

try:
    with (case / 'private-recorder.log').open('w') as log:
        recorder = subprocess.Popen(['xcrun', 'simctl', 'io', device, 'recordVideo', '--codec=h264', str(case / 'video.mp4')], stdout=log, stderr=subprocess.STDOUT)
    deadline = time.monotonic() + 10
    while 'Recording started' not in (case / 'private-recorder.log').read_text():
        if recorder.poll() is not None or time.monotonic() >= deadline:
            raise RuntimeError('Parent-owned recorder did not start')
        time.sleep(.05)
    with (case / 'private-run.log').open('w') as log:
        node = subprocess.Popen(['node', str(case / 'executed-wrapper.mjs')], cwd=args.sdk_root, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        (case / 'private-owned-node.json').write_text(json.dumps({'pid': node.pid, 'processGroup': node.pid}, indent=2) + '\n')
        try:
            result['exitCode'] = node.wait(timeout=600)
        except subprocess.TimeoutExpired:
            result['nodeTimedOut'] = True
            stop_group()
            result['exitCode'] = node.poll()
except Exception as error:
    result['harnessError'] = {'name': type(error).__name__, 'message': str(error)}
finally:
    try:
        with (case / 'private-daemon-cleanup.log').open('w') as log:
            result['cleanupExitCode'] = subprocess.run(['node', str(args.sdk_root / 'bin/agent-device.mjs'), 'daemon', 'stop', '--state-dir', str(root / ('state-' + args.phase)), '--clean', '--json'], cwd=args.sdk_root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=60).returncode
    except Exception as error:
        result['daemonCleanupError'] = {'name': type(error).__name__, 'message': str(error)}
    try:
        stop_group()
    except Exception as error:
        result['nodeGroupCleanupError'] = {'name': type(error).__name__, 'message': str(error)}
    try:
        if recorder is not None:
            if recorder.poll() is None:
                recorder.send_signal(signal.SIGINT)
            try:
                recorder.wait(timeout=10)
            except subprocess.TimeoutExpired:
                result['recorderEscalated'] = True
                recorder.terminate()
                try:
                    recorder.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    recorder.kill()
                    recorder.wait(timeout=3)
            result['recorderExitCode'] = recorder.returncode
    except Exception as error:
        result['recorderCleanupError'] = {'name': type(error).__name__, 'message': str(error)}
    try:
        result['sourceUnchanged'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.sdk_root, text=True).strip() == args.head and not subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=args.sdk_root, text=True)
    except Exception as error:
        result['sourceVerificationError'] = {'name': type(error).__name__, 'message': str(error)}
    data = {}
    try:
        if (case / 'result.json').exists():
            shutil.copyfile(case / 'result.json', case / 'node-result.json')
            data = json.loads((case / 'node-result.json').read_text())
    except Exception as error:
        result['nodeResultError'] = {'name': type(error).__name__, 'message': str(error)}
    failures = ['nodeTimedOut', 'nodeGroupEscalated', 'nodeGroupStillAlive', 'nodeGroupCleanupError', 'recorderEscalated', 'recorderCleanupError', 'daemonCleanupError', 'harnessError', 'sourceVerificationError', 'nodeResultError']
    result['success'] = data.get('success') is True and result.get('exitCode') == 0 and result.get('cleanupExitCode') == 0 and result.get('recorderExitCode') == 0 and result.get('sourceUnchanged') is True and not any(result.get(key) for key in failures)
    recording = {'code': result.get('recorderExitCode'), 'escalated': result.get('recorderEscalated', False), 'ownedBy': 'Python driver'}
    data.update(parentDriver=result, recording=recording, success=result['success'])
    (case / 'result.json').write_text(json.dumps(data, indent=2) + '\n')
samples = [sample['ms'] for sample in data.get('samples', []) if sample.get('kind') == 'ref']
events = Counter(event.get('event') for event in data.get('events', []) if 'Received' in str(event.get('event')))
summary = {**result, 'warmRefsMs': samples, 'medianMs': statistics.median(samples) if samples else None,
           'cliMs': data.get('cli', {}).get('ms'), 'targetTaps': data.get('targetTapEvents'),
           'siblingTaps': data.get('otherTapEvents'), 'inputEvents': dict(events),
           'frameComparison': data.get('frameComparison'), 'error': data.get('error') or data.get('harnessError'),
           'recording': recording}
(case / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
raise SystemExit(0 if result['success'] else 1)
