#!/usr/bin/env python3
"""Observe real SDK dismissal behavior on an exclusively owned simulator."""
import argparse
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--udid', required=True)
parser.add_argument('--sdk-cli', required=True)
parser.add_argument('--state-dir', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--session', default='keyboard-dismiss-native-proof')
args = parser.parse_args()
output = Path(args.out)
output.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'AGENT_DEVICE_STATE_DIR': args.state_dir}
selection = ['--platform', 'ios', '--udid', args.udid, '--session', args.session, '--json']
results = []


def run(label, *command, allow_unsupported=False):
    process = subprocess.run(['node', args.sdk_cli, *command, *selection], env=env, capture_output=True, text=True)
    result = json.loads(process.stdout)
    (output / f'{label}.json').write_text(json.dumps(result, indent=2) + '\n')
    if process.returncode and not (allow_unsupported and result.get('error', {}).get('code') == 'UNSUPPORTED_OPERATION'):
        raise RuntimeError(f'{label}: {result}')
    results.append({'step': label, 'success': result['success'], 'result': result.get('data', result.get('error', {}))})
    return result


def snapshot(label, changed=False):
    data = run(label, 'snapshot')['data']
    fields = {node.get('identifier'): node.get('label') for node in data['nodes'] if node.get('identifier')}
    assert fields['changes'] == f'Option changes: {1 if changed else 0}', fields
    assert fields['option-state'] == ('Option: on' if changed else 'Option: off'), fields
    return data


run('open', 'open', 'com.example.keyboard-dismiss-native', '--relaunch')
snapshot('hidden-before')
for index in range(3):
    result = run(f'hidden-dismiss-{index}', 'keyboard', 'dismiss')['data']
    assert result['wasVisible'] is False and result['visible'] is False, result
snapshot('hidden-after')
for index in range(3):
    run(f'focus-{index}', 'press', 'id="notes"')
    run(f'focused-dismiss-{index}', 'keyboard', 'dismiss', allow_unsupported=True)
    snapshot(f'focused-after-{index}')
    run(f'hide-{index}', 'press', 'id="hide-keyboard"')
    run(f'fast-hidden-dismiss-{index}', 'keyboard', 'dismiss', allow_unsupported=True)
    current = snapshot(f'fast-hidden-after-{index}')
thumb = next(node for node in current['nodes'] if node.get('type') == 'Switch' and not node.get('identifier'))
run('positive-control-toggle', 'press', '@' + thumb['ref'], '--settle')
snapshot('positive-control-after', changed=True)
(output / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps({'steps': len(results), 'hiddenDismissals': 3, 'fastFocusHideCycles': 3, 'unexpectedFormChanges': 0, 'positiveToggleObserved': True}))
