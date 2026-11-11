import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import signal
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--source-root', type=Path, required=True)
parser.add_argument('--expected-head', required=True)
parser.add_argument('--manifest', type=Path, required=True)
parser.add_argument('--device', required=True)
parser.add_argument('--role', required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--test', action='append', required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=False)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.source_root, text=True).strip()
status = subprocess.check_output(['git', 'status', '--porcelain=v1'], cwd=args.source_root, text=True)
assert head == args.expected_head and not status, 'Expected clean source commit'
manifest = json.loads(args.manifest.read_text())
fingerprint = subprocess.check_output([
    'node', '--experimental-strip-types', '--input-type=module', '-e',
    'import {computeRunnerSourceFingerprint} from "./packages/apple-runner/src/runner-source.ts"; console.log(computeRunnerSourceFingerprint(process.cwd()));',
], cwd=args.source_root, text=True).strip()
assert fingerprint == manifest['runnerSourceFingerprint'], 'Native artifact source mismatch'
entry = next(e for e in manifest['artifacts']['entries'] if e['path'].endswith('xctest/AgentDeviceRunnerUITests'))
binary_hash = hashlib.sha256((args.manifest.parent / entry['path']).read_bytes()).hexdigest()
assert binary_hash == entry['digest'], 'Native artifact byte mismatch'
shutil.copyfile(__file__, args.out / 'executed-wrapper.py')
shutil.copyfile(args.manifest, args.out / 'private-native-manifest.json')
runtime = [{'path': str(p.relative_to(args.source_root)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((args.source_root / 'dist/src').glob('*.js'))]
(args.out / 'runtime-js-manifest.json').write_text(json.dumps({'head': head, 'files': runtime}, indent=2) + '\n')
row = {'head': head, 'role': args.role, 'tests': args.test, 'nativeFingerprint': fingerprint,
       'nativeBinarySha256': binary_hash, 'wrapperSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
       'sourceTree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], cwd=args.source_root, text=True).strip(),
       'archivedBeforeRun': True}
(args.out / 'execution-inputs.json').write_text(json.dumps(row, indent=2) + '\n')
command = ['xcodebuild', 'test-without-building', '-xctestrun', manifest['artifacts']['xctestrunPath'],
           '-destination', 'platform=iOS Simulator,id=' + args.device, '-parallel-testing-enabled', 'NO',
           '-test-timeouts-enabled', 'YES', '-default-test-execution-time-allowance', '60',
           '-maximum-test-execution-time-allowance', '60', '-resultBundlePath', str(args.out / 'selected.xcresult')]
command += ['-only-testing:AgentDeviceRunnerUITests/RunnerTests/' + name for name in args.test]
(args.out / 'private-run-request.json').write_text(json.dumps({'command': command}, indent=2) + '\n')
record_log = (args.out / 'private-recorder.log').open('w')
recorder = subprocess.Popen(['xcrun', 'simctl', 'io', args.device, 'recordVideo', '--codec=h264', str(args.out / 'video.mp4')], stdout=subprocess.DEVNULL, stderr=record_log)
try:
    began = time.monotonic()
    while 'Recording started' not in (args.out / 'private-recorder.log').read_text():
        if recorder.poll() is not None or time.monotonic() - began > 10:
            raise RuntimeError('Recorder did not start')
        time.sleep(0.1)
    subprocess.run(['xcrun', 'simctl', 'io', args.device, 'screenshot', str(args.out / 'before.png')], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
    with (args.out / 'private-xcodebuild.log').open('w') as log:
        try:
            result = subprocess.run(command, cwd=args.source_root, stdout=log, stderr=subprocess.STDOUT, timeout=300)
            row['exitCode'] = result.returncode
        except subprocess.TimeoutExpired:
            row.update(exitCode=124, failurePhase='outer deadline')
    subprocess.run(['xcrun', 'simctl', 'io', args.device, 'screenshot', str(args.out / 'after.png')], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
except Exception as error:
    row['harnessError'] = str(error)
finally:
    recorder.send_signal(signal.SIGINT)
    try:
        row['recordingExitCode'] = recorder.wait(timeout=10)
    except subprocess.TimeoutExpired:
        recorder.kill()
        row['recordingExitCode'] = recorder.wait(timeout=5)
    record_log.close()
log = (args.out / 'private-xcodebuild.log').read_text() if (args.out / 'private-xcodebuild.log').exists() else ''
counts = [(int(a), int(b)) for a, b in re.findall(r'Executed (\d+) tests?, with (\d+) failures?', log)]
row['observedTests'] = max((a for a, b in counts), default=0)
row['observedFailures'] = max((b for a, b in counts), default=0)
row['success'] = row.get('exitCode') == 0 and row['observedTests'] == len(args.test) and row['observedFailures'] == 0 and row.get('recordingExitCode') == 0 and 'harnessError' not in row
(args.out / 'result.json').write_text(json.dumps(row, indent=2) + '\n')
print(json.dumps(row, indent=2))
raise SystemExit(0 if row['success'] else 1)
