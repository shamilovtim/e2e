import type { E2EConfig } from 'e2e';
import { buildEngine } from '../../../dist/engine.js';
import { AgentDeviceSurface } from '../../../dist/surface.js';
import { createFakeClient } from '../../helpers/fake-client.ts';

export default {
  tests: './dismiss.e2e.ts',
  workers: 1,
  retries: 0,
  video: 'off',
  targets: [
    { name: 'absent', keyboard: { kind: 'absent' } },
    { name: 'offscreen', keyboard: { kind: 'visible', frame: { x: 0, y: 869, width: 393, height: 227 } } },
  ].map(({ name, keyboard }) => {
    let changed = false;
    const fake = createFakeClient({
      'capture.snapshot': () => ({
        appName: 'Keyboard demo',
        appBundleId: 'com.example.keyboard-demo',
        viewport: { width: 393, height: 852 },
        keyboard,
        nodes: [
          { ref: '@e1', index: 0, depth: 0, type: 'application', label: 'Keyboard demo', rect: { x: 0, y: 0, width: 393, height: 852 } },
          { ref: '@e2', index: 1, parentIndex: 0, depth: 1, type: 'static-text', label: changed ? 'Changed' : 'Unchanged', rect: { x: 20, y: 200, width: 350, height: 44 } },
        ],
      }),
      // This models the unwanted input, not a claim about current native SDK behavior.
      'command.keyboard': () => { changed = true; return {}; },
      'capture.screenshot': () => ({ logicalWidth: 393, logicalHeight: 852 }),
    });
    return {
      name,
      app: { bundleId: 'com.example.keyboard-demo' },
      engine: buildEngine(new AgentDeviceSurface({ platform: 'ios', device: 'scripted-device', transition: 0 }, () => fake.client)),
    };
  }),
} satisfies E2EConfig;
