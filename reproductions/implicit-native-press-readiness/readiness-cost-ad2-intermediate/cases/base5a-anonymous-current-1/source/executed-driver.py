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
parser.add_argument('kind', choices=['geometry', 'values', 'variant'])
parser.add_argument('mode')
parser.add_argument('phase')
parser.add_argument('--sdk-root', type=Path, required=True)
parser.add_argument('--derived', type=Path, required=True)
parser.add_argument('--head', required=True)
parser.add_argument('--fixture-sha', required=True)
parser.add_argument('--runtime-manifest', type=Path, required=True)
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
wrapper = Path(__file__).with_name('run-' + args.kind + '.mjs')
shutil.copyfile(wrapper, case / 'executed-wrapper.mjs')
shutil.copyfile(__file__, case / 'executed-driver.py')
shutil.copyfile(manifest_path, case / 'private-native-manifest.json')
shutil.copyfile(args.runtime_manifest, case / 'runtime-js-manifest.json')
inputs = {'head': args.head, 'kind': args.kind, 'mode': args.mode,
          'sourceTree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=args.sdk_root, text=True).strip(),
          'nativeFingerprint': native_fp, 'nativeBinarySha256': binary['digest'],
          'fixtureBinarySha256': args.fixture_sha, 'runtimeJSFiles': len(runtime['files']),
          'wrapperSha256': hashlib.sha256(wrapper.read_bytes()).hexdigest(),
          'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'archivedBeforeRun': True,
          'warmRefRuns': int(os.environ.get('QA_RUNS', '3')),
          'callerSignalBudgetMs': int(os.environ.get('QA_OBSERVATION_MS', '15000'))}
(case / 'execution-inputs.json').write_text(json.dumps(inputs, indent=2) + '\n')
owned = json.loads((root / 'owned-device-state-private.json').read_text())
role = 'ipad' if args.mode in ['ipad', 'tree-ref', 'alias'] else 'phone'
device = next(x['udid'] for x in owned if x['role'] == role)
env = os.environ.copy()
env.update(QA_ROOT=str(root), QA_PHASE=args.phase, QA_MODE=args.mode, SDK_ROOT=str(args.sdk_root),
           NATIVE_DERIVED=str(args.derived), QA_SDK_SOURCE=args.head, QA_NATIVE_BUILT_AT=args.head,
           QA_NATIVE_FP=native_fp, QA_FIXTURE_BINARY_SHA=args.fixture_sha,
           QA_JS_MANIFEST=str(case / 'runtime-js-manifest.json'), QA_DEVICE=device)
with (case / 'private-run.log').open('w') as log:
    result = subprocess.run(['node', str(case / 'executed-wrapper.mjs')], cwd=args.sdk_root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=600)
with (case / 'private-daemon-cleanup.log').open('w') as log:
    stop = subprocess.run(['node', str(args.sdk_root / 'bin/agent-device.mjs'), 'daemon', 'stop', '--state-dir', str(root / ('state-' + args.phase)), '--clean', '--json'], cwd=args.sdk_root, stdout=log, stderr=subprocess.STDOUT, timeout=60)
data = json.loads((case / 'result.json').read_text()) if (case / 'result.json').exists() else {}
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
