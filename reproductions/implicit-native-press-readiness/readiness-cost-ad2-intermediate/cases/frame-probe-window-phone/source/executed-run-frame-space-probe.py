import argparse
import json
import hashlib
from pathlib import Path
import subprocess
import signal
import time

parser = argparse.ArgumentParser()
parser.add_argument('--source-root', type=Path, required=True)
parser.add_argument('--source-metadata', type=Path)
parser.add_argument('--xctestrun', required=True)
parser.add_argument('--device', required=True)
parser.add_argument('--role', choices=['phone', 'placed-tablet'], required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
metadata = json.loads((args.source_metadata or Path(__file__).with_name('frame-space-probe-source.json')).read_text())
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.source_root, text=True).strip()
changed = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD'], cwd=args.source_root, text=True).splitlines()
assert head == metadata['head'] and changed == [metadata['changedFile']], 'Unexpected diagnostic source'
assert hashlib.sha256((args.source_root / metadata['changedFile']).read_bytes()).hexdigest() == metadata['expectedFileSha256'], 'Diagnostic patch mismatch'
command = [
    'xcodebuild', 'test-without-building', '-xctestrun', args.xctestrun,
    '-destination', 'platform=iOS Simulator,id=' + args.device,
    '-parallel-testing-enabled', 'NO', '-test-timeouts-enabled', 'YES',
    '-default-test-execution-time-allowance', '30',
    '-maximum-test-execution-time-allowance', '30',
    '-only-testing:AgentDeviceRunnerUITests/RunnerTests/testDiagnosticPressCandidateSnapshotFrameSpace',
    '-resultBundlePath', str(args.out / 'frame-probe.xcresult'),
]
row = {'role': args.role, 'selectedTests': 1, 'candidateSnapshotReads': 1,
       'scope': 'Isolated 7ab3 source plus the diagnostic patch; no performance claim.'}
recording_log = (args.out / 'private-recorder.log').open('w')
recorder = subprocess.Popen(['xcrun', 'simctl', 'io', args.device, 'recordVideo', '--codec=h264', str(args.out / 'video.mp4')], stdout=subprocess.DEVNULL, stderr=recording_log)
started = time.monotonic()
while 'Recording started' not in (args.out / 'private-recorder.log').read_text():
    if recorder.poll() is not None or time.monotonic() - started > 10:
        raise RuntimeError('Diagnostic recorder did not start')
    time.sleep(0.1)
subprocess.run(['xcrun', 'simctl', 'io', args.device, 'screenshot', str(args.out / 'before.png')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15, check=True)
with (args.out / 'private-xcodebuild.log').open('w') as log:
    try:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=120)
        row['exitCode'] = result.returncode
    except subprocess.TimeoutExpired:
        row.update(exitCode=124, setupFailure='outer deadline expired')
subprocess.run(['xcrun', 'simctl', 'io', args.device, 'screenshot', str(args.out / 'after.png')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15, check=True)
recorder.send_signal(signal.SIGINT)
try:
    row['recordingExitCode'] = recorder.wait(timeout=10)
except subprocess.TimeoutExpired:
    recorder.kill()
    row['recordingExitCode'] = recorder.wait(timeout=5)
recording_log.close()
marker = 'AGENT_DEVICE_FRAME_SPACE_PROBE='
for line in (args.out / 'private-xcodebuild.log').read_text().splitlines():
    if marker in line:
        row['frames'] = json.JSONDecoder().raw_decode(line.split(marker, 1)[1])[0]
if 'frames' in row:
    frame = row['frames']['appFrame']
    window = row['frames']['windows'][row['frames'].get('candidateWindowIndex', 0)]
    origin = window['live'][:2]
    row['expectedOriginEstablished'] = (abs(origin[0]) <= 1 and abs(origin[1]) <= 1) == (args.role == 'phone')
    row['probeScopeMatches'] = not metadata.get('queryScope') or row['frames'].get('queryScope') == metadata['queryScope']
    live = row['frames']['candidateLiveFrame']
    captured = row['frames']['candidateSnapshotFrame']
    row['snapshotFrameMatchesLive'] = all(abs(a - b) <= 1 for a, b in zip(live, captured))
    row['rootTranslatedSnapshotMatchesLive'] = all(abs(a - b) <= 1 for a, b in zip(live, [captured[0] + frame[0], captured[1] + frame[1], captured[2], captured[3]]))
    row['owningWindowTranslatedSnapshotMatchesLive'] = all(abs(a - b) <= 1 for a, b in zip(live, [captured[0] + window['live'][0] - window['snapshot'][0], captured[1] + window['live'][1] - window['snapshot'][1], captured[2], captured[3]]))
row['qualified'] = row.get('exitCode') == 0 and row.get('expectedOriginEstablished', False) and row.get('probeScopeMatches', False)
(args.out / 'frame-space-result.json').write_text(json.dumps(row, indent=2) + '\n')
print(json.dumps(row, indent=2))
raise SystemExit(0 if row['qualified'] else 1)
