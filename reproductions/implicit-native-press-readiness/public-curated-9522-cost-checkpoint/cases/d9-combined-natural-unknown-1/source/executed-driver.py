import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import shutil
import statistics
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('kind', choices=['geometry', 'values', 'variant', 'unknown'])
parser.add_argument('mode')
parser.add_argument('phase')
parser.add_argument('--sdk-root', type=Path, required=True)
parser.add_argument('--derived', type=Path, required=True)
parser.add_argument('--head', required=True)
parser.add_argument('--fixture-sha', required=True)
parser.add_argument('--runtime-manifest', type=Path, required=True)
parser.add_argument('--wrapper', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
case = root / 'evidence' / args.phase
case.mkdir(parents=True, exist_ok=False)
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.sdk_root, text=True).strip() == args.head
assert not subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=args.sdk_root, text=True)
manifest_path = args.derived / '.agent-device-runner-cache.json'
manifest = json.loads(manifest_path.read_text())
native_fp = subprocess.check_output(['node', '--experimental-strip-types', '--input-type=module', '-e', 'import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts";console.log(computeRunnerSourceFingerprint(process.cwd()));'], cwd=args.sdk_root, text=True).strip()
assert native_fp == manifest['runnerSourceFingerprint']
binary = next(x for x in manifest['artifacts']['entries'] if x['path'].endswith('xctest/AgentDeviceRunnerUITests'))
assert hashlib.sha256((args.derived / binary['path']).read_bytes()).hexdigest() == binary['digest']
runtime = json.loads(args.runtime_manifest.read_text())
assert runtime['head'] == args.head
for entry in runtime['files']:
    assert hashlib.sha256((args.sdk_root / entry['path']).read_bytes()).hexdigest() == entry['sha256']
wrapper = args.wrapper or Path(__file__).with_name('run-' + args.kind + '.mjs')
shutil.copyfile(wrapper, case / 'executed-wrapper.mjs')
shutil.copyfile(__file__, case / 'executed-driver.py')
shutil.copyfile(manifest_path, case / 'private-native-manifest.json')
shutil.copyfile(args.runtime_manifest, case / 'runtime-js-manifest.json')
source_patch = subprocess.check_output(['git', 'show', '--format=', '--binary', 'HEAD'], cwd=args.sdk_root)
(case / 'source-commit.patch').write_bytes(source_patch)
source_tree = subprocess.check_output(['git', 'ls-tree', '-r', 'HEAD'], cwd=args.sdk_root)
(case / 'source-tree-manifest.txt').write_bytes(source_tree)
inputs = {'head': args.head, 'kind': args.kind, 'mode': args.mode,
          'sourceTree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=args.sdk_root, text=True).strip(),
          'nativeFingerprint': native_fp, 'nativeBinarySha256': binary['digest'],
          'fixtureBinarySha256': args.fixture_sha, 'runtimeJSFiles': len(runtime['files']),
          'wrapperSha256': hashlib.sha256(wrapper.read_bytes()).hexdigest(),
          'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'archivedBeforeRun': True,
          'warmRefRuns': int(os.environ.get('QA_RUNS', '3')),
          'callerSignalBudgetMs': int(os.environ.get('QA_OBSERVATION_MS', '15000')),
          'explicitNormalBudgetWarmup': os.environ.get('QA_WARMUP_REF') == '1',
          'sourceCommitPatchSha256': hashlib.sha256(source_patch).hexdigest(),
          'sourceTreeManifestSha256': hashlib.sha256(source_tree).hexdigest()}
(case / 'execution-inputs.json').write_text(json.dumps(inputs, indent=2) + '\n')
owned = json.loads((root / 'owned-device-state-private.json').read_text())
role = 'ipad' if args.mode in ['ipad', 'tree-ref', 'alias', 'unknown'] else 'phone'
device = next(x['udid'] for x in owned if x['role'] == role)
env = os.environ.copy()
env.update(QA_ROOT=str(root), QA_PHASE=args.phase, QA_MODE=args.mode, SDK_ROOT=str(args.sdk_root),
           NATIVE_DERIVED=str(args.derived), QA_SDK_SOURCE=args.head, QA_NATIVE_BUILT_AT=args.head,
           QA_NATIVE_FP=native_fp, QA_FIXTURE_BINARY_SHA=args.fixture_sha,
           QA_JS_MANIFEST=str(case / 'runtime-js-manifest.json'), QA_DEVICE=device)
if args.kind == 'unknown':
    installed = Path(subprocess.check_output(['xcrun', 'simctl', 'get_app_container', device, 'dev.e2e.readinessgeometry', 'app'], text=True).strip())
    executable = subprocess.check_output(['plutil', '-extract', 'CFBundleExecutable', 'raw', '-o', '-', str(installed / 'Info.plist')], text=True).strip()
    actual_fixture = hashlib.sha256((installed / executable).read_bytes()).hexdigest()
    assert actual_fixture == args.fixture_sha
    inputs['observedFixtureBinarySha256'] = actual_fixture
    (case / 'execution-inputs.json').write_text(json.dumps(inputs, indent=2) + '\n')
    env.update(SDK_ENTRY=str(args.sdk_root / 'dist/src/index.js'), GEOMETRY_ROOT=str(root),
               GEOMETRY_PHASE=args.phase, GEOMETRY_DEVICE=device,
               NATIVE_XCTESTRUN=manifest['artifacts']['xctestrunPath'])
with (case / 'private-run.log').open('w') as log:
    result = subprocess.run(['node', str(case / 'executed-wrapper.mjs')], cwd=args.sdk_root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=600)
with (case / 'private-daemon-cleanup.log').open('w') as log:
    stop = subprocess.run(['node', str(args.sdk_root / 'bin/agent-device.mjs'), 'daemon', 'stop', '--state-dir', str(root / ('state-' + args.phase)), '--clean', '--json'], cwd=args.sdk_root, stdout=log, stderr=subprocess.STDOUT, timeout=60)
data = json.loads((case / 'result.json').read_text()) if (case / 'result.json').exists() else {}
if args.kind == 'unknown':
    native = data.get('nativeCapture', {}).get('result', {}).get('data', {})
    viewport_kind = native.get('snapshotViewport', {}).get('kind')
    target = next((n for n in native.get('nodes', []) if n.get('identifier') == 'geometry-action'), {})
    refusals = [data.get(k, {}).get('error', {}).get('details', {}) for k in ['refPress', 'selectorPress']]
    counters = [data.get(k) for k in ['counterBefore', 'counterAfterRef', 'counterAfterSelector']]
    log_path = data.get('open', {}).get('result', {}).get('runnerLogPath')
    log = Path(log_path).read_text() if log_path and Path(log_path).exists() else ''
    readiness_count = log.count('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED command=pressReadiness ')
    tap_count = log.count('AGENT_DEVICE_RUNNER_COMMAND_ACCEPTED command=tap ')
    classification = {'source': args.head, 'viewportKind': viewport_kind,
                      'nativeBindingPresent': bool(target.get('nativePressTarget')),
                      'trustedPublicViewportPresent': bool(data.get('snapshot', {}).get('result', {}).get('viewport')),
                      'refusalDetails': refusals, 'counters': counters,
                      'nativeReadinessAcceptedCount': readiness_count, 'nativeTapAcceptedCount': tap_count,
                      'producerPins': data.get('producerPins'), 'externalPressAbort': data.get('externalAbort')}
    classification['unknownSetupEstablished'] = viewport_kind in ['derived', 'missing']
    classification['success'] = classification['unknownSetupEstablished'] and classification['nativeBindingPresent'] and not classification['trustedPublicViewportPresent'] and all(r.get('reason') == 'window-origin-unknown' and r.get('dispatched') == 'no' for r in refusals) and counters == [0, 0, 0] and readiness_count == 0 and tap_count == 0 and str(args.derived) in log and 'build-for-testing' not in log
    (case / 'classification.json').write_text(json.dumps(classification, indent=2) + '\n')
    data['success'] = classification['success']
    data['events'] = data.get('finalEvents', [])
    if not classification['unknownSetupEstablished']:
        data['harnessError'] = {'classification': 'setup_not_established', 'viewportKind': viewport_kind}
samples = [s['ms'] for s in data.get('samples', []) if s.get('kind') == 'ref']
events = Counter(e.get('event') for e in data.get('events', []) if 'Received' in str(e.get('event')))
summary = {'phase': args.phase, 'source': args.head, 'exitCode': result.returncode, 'cleanupExitCode': stop.returncode,
           'success': data.get('success'), 'warmRefsMs': samples, 'medianMs': statistics.median(samples) if samples else None,
           'cliMs': data.get('cli', {}).get('ms'), 'targetTaps': data.get('targetTapEvents'),
           'siblingTaps': data.get('otherTapEvents'), 'inputEvents': dict(events),
           'frameComparison': data.get('frameComparison'), 'error': data.get('error') or data.get('harnessError'),
           'recording': data.get('recording')}
(case / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
raise SystemExit(0 if result.returncode == 0 and data.get('success') and stop.returncode == 0 else 1)
